import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

export const getAnalyticsController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { projectId } = req.params;
        const clickhouseClient = global.clickhouseClient;
        if (!clickhouseClient) {
            return res.status(500).json({ success: false, error: "ClickHouse not initialized" });
        }

        const last7DaysFilter = `timestamp >= now() - 7*24*60*60`;
        const last7DaysCondition = `timestamp >= now() - INTERVAL 7 DAY`;

        const [
            countryRows,
            deviceRows,
            browserRows,
            osRows,
            referrerRows,
            dailyVisitorsRows,
            languageRows,
            avgVisitsRows,
            totalUniqueVisitorsRows
        ] = await Promise.all([
            // 1. Country Distribution
            clickhouseClient.query({
                query: `
                    SELECT country, COUNT(DISTINCT ip) AS visitors
                    FROM project_analytics
                    WHERE project_id = {projectId:String} AND ${last7DaysCondition}
                      AND country != ''
                    GROUP BY country
                    ORDER BY visitors DESC
                    LIMIT 10
                `,
                query_params: { projectId },
                format: "JSONEachRow"
            }).then((r: any) => r.json()),

            // 2. Device Type Distribution
            clickhouseClient.query({
                query: `
                    SELECT device_type, COUNT(*) AS count
                    FROM project_analytics
                    WHERE project_id = {projectId:String} AND ${last7DaysFilter}
                    GROUP BY device_type
                `,
                query_params: { projectId },
                format: "JSONEachRow"
            }).then((r: any) => r.json()),

            // 3. Browser Share
            clickhouseClient.query({
                query: `
                    SELECT browser, COUNT(*) AS count
                    FROM project_analytics
                    WHERE project_id = {projectId:String} AND ${last7DaysFilter}
                    GROUP BY browser
                    ORDER BY count DESC
                `,
                query_params: { projectId },
                format: "JSONEachRow"
            }).then((r: any) => r.json()),

            // 4. OS Share
            clickhouseClient.query({
                query: `
                    SELECT os, COUNT(*) AS count
                    FROM project_analytics
                    WHERE project_id = {projectId:String} AND ${last7DaysFilter}
                    GROUP BY os
                    ORDER BY count DESC
                `,
                query_params: { projectId },
                format: "JSONEachRow"
            }).then((r: any) => r.json()),

            // 5. Top Referrers
            clickhouseClient.query({
                query: `
                    SELECT referrer, COUNT(*) AS count
                    FROM project_analytics
                    WHERE project_id = {projectId:String} AND ${last7DaysFilter}
                    GROUP BY referrer
                    ORDER BY count DESC
                    LIMIT 10
                `,
                query_params: { projectId },
                format: "JSONEachRow"
            }).then((r: any) => r.json()),

            // 6. Daily Unique Visitors (trend)
            clickhouseClient.query({
                query: `
                    SELECT toDate(timestamp) AS date, COUNT(DISTINCT ip) AS unique_visitors
                    FROM project_analytics
                    WHERE project_id = {projectId:String} AND ${last7DaysFilter}
                    GROUP BY date
                    ORDER BY date ASC
                `,
                query_params: { projectId },
                format: "JSONEachRow"
            }).then((r: any) => r.json()),

            // 7. Language Preferences
            clickhouseClient.query({
                query: `
                    SELECT accept_language, COUNT(*) AS count
                    FROM project_analytics
                    WHERE project_id = {projectId:String} AND ${last7DaysFilter}
                    GROUP BY accept_language
                    ORDER BY count DESC
                    LIMIT 10
                `,
                query_params: { projectId },
                format: "JSONEachRow"
            }).then((r: any) => r.json()),

            // 8. Average Visits per IP
            clickhouseClient.query({
                query: `
                    SELECT round(avg(visits), 2) AS avg_visits_per_ip
                    FROM (
                        SELECT ip, COUNT(*) AS visits
                        FROM project_analytics
                        WHERE project_id = {projectId:String} AND ${last7DaysFilter}
                        GROUP BY ip
                    )
                `,
                query_params: { projectId },
                format: "JSONEachRow"
            }).then((r: any) => r.json()),

            // 9. Total Unique Visitors in last 7 days
            clickhouseClient.query({
                query: `
                    SELECT COUNT(DISTINCT ip) AS total_unique_visitors
                    FROM project_analytics
                    WHERE project_id = {projectId:String} AND ${last7DaysFilter}
                `,
                query_params: { projectId },
                format: "JSONEachRow"
            }).then((r: any) => r.json())
        ]);

        return res.status(200).json({
            success: true,
            analytics: {
                countryDistribution: countryRows,
                deviceTypeDistribution: deviceRows,
                browserDistribution: browserRows,
                osDistribution: osRows,
                topReferrers: referrerRows,
                dailyVisitorsTrend: dailyVisitorsRows,
                languagePreferences: languageRows,
                averageVisitsPerIp: avgVisitsRows?.[0]?.avg_visits_per_ip || 0,
                totalUniqueVisitors: totalUniqueVisitorsRows?.[0]?.total_unique_visitors || 0
            }
        });

    } catch (error: unknown) {
        console.error("Error fetching analytics:", error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Internal Server Error",
        });
    }
};
