const express = require('express');
const httpProxy = require('http-proxy');
const { connectDb } = require('./db');
const ProjectModel = require('./models/project');
const rateLimiter = require('express-rate-limit');
const requestIp = require('request-ip');
const geoip = require('geoip-lite');
const UAParser = require('ua-parser-js');
const { kafkaConnect, pushAnalyticsToKafka } = require('./utils/kafka');
const { connectRedis } = require('./utils/redisClient');
const { getSecrets } = require('./utils/secrets');
require('dotenv').config()

const app = express();
const PORT = process.env.PORT || 8001;

const BASE_URL = "https://dumcel-build-outputs.s3.ap-south-1.amazonaws.com/_output"
const proxy = httpProxy.createProxyServer();

const limiter = rateLimiter({
    windowMs: 1 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 429,
        error: 'The Code Just Cried',
        message: "🚨 **\[Achievement Unlocked: ENEMY SPOTTED (The Abuser)]** 🚨 Slow down! This is a single-server demo, not a global CDN. I'm trying to get a job, not run a datacenter! **Don't break the portfolio project!** Wait a minute, please. (P.S. If you're a recruiter with **open roles**, I'd love an interview opportunity! You've seen my code handles pressure... a little too well.)",
    },
})

app.use(limiter);

app.use(async (req, res, next) => {
    const hostName = req.headers.host;
    if (!hostName) return res.status(400).send('Bad Request: Missing host header');

    const subDomain = hostName.split('.')[0];
    const cacheKey = `subDomain:${subDomain}`;

    const client = global.redisClient

    try {
        // -------------------------
        // Get project
        // -------------------------
        let project = await client.get(cacheKey);
        if (project) {
            project = JSON.parse(project);
        } else {
            project = await ProjectModel.findOne({ subDomain }, { subDomain: 1 }).lean();
            if (!project) return res.status(404).send('Not Found');

            await client.set(cacheKey, JSON.stringify(project), 'EX', 600);
        }

        const projectId = project._id;

        // -------------------------
        // Analytics
        // -------------------------
        const ip = requestIp.getClientIp(req) || 'unknown';
        const geo = geoip.lookup(ip) || {};
        const country = geo.country || 'unknown';
        const latitude = geo.ll ? geo.ll[0] : null;
        const longitude = geo.ll ? geo.ll[1] : null;

        const parser = new UAParser(req.headers['user-agent']);
        const uaResult = parser.getResult();

        const analyticsData = {
            projectId,
            subDomain,
            ip,
            country,
            latitude,
            longitude,
            timestamp: new Date().toISOString(),
            referrer: req.headers.referer || 'direct',
            deviceType: uaResult.device.type || 'desktop',
            browser: uaResult.browser.name || 'unknown',
            os: uaResult.os.name || 'unknown',
            acceptLanguage: req.headers['accept-language'] || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            cookies: req.headers.cookie || null,
            authorization: req.headers.authorization || null,
        };

        // Optional: push to Kafka
        // await pushAnalyticsToKafka('project-analytics', analyticsData);

        // attach projectId for proxy
        req.projectId = projectId;
        next();
    } catch (err) {
        console.error('Analytics logging failed:', err);
        next(); // continue to proxy even if logging fails
    }
});

app.use(async (req, res) => {
    const projectId = req.projectId; // set by analytics middleware
    const resolveTo = `${BASE_URL}/${projectId}`;

    try {
        proxy.web(req, res, { target: resolveTo, changeOrigin: true });
    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

proxy.on('proxyReq', (proxyReq, req, res) => { const url = req.url; if (url === '/') { proxyReq.path += 'index.html'; } return proxyReq; })

app.get('/health', (req, res) => {
    res.status(200).send('Health OK');
})

app.listen(PORT, "0.0.0.0", async () => {
    // --- Production (fetch from secrets) ---
    const secrets = await getSecrets();
    global.secrets = secrets;

    await connectDb();
    // await kafkaConnect();
    await connectRedis();
    console.log(`Reverse proxy running on http://localhost:${PORT}`)
})
