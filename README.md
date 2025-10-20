<img width="50" height="50" alt="Gemini_Generated_Image_mpjp3tmpjp3tmpjp-removebg-preview" src="https://github.com/user-attachments/assets/5a97a4af-a39b-4f35-b1b2-5bf3cfd4ba52" /> 

# DUMCEL

## Overview
Dumcel is a Vercel-like platform built with **TypeScript, MERN, Kafka, Redis, AWS, Docker**. It supports GitHub login, project deployments, payments, and analytics. Designed as a microservice architecture for scalability and clarity.

---

## Microservices
### 1. **API Gateway / Proxy Service**
- Entry point for all requests.
- Handles DNS + wildcard subdomains (`*.dumcel.com` ).
- Routes traffic to Auth, Dashboard, Payments, or Deployment (S3/CloudFront).
- **Tech**: Nginx / Traefik on AWS EC2/ECS.
### 2. **Auth Service**
- User authentication with **GitHub OAuth**.
- Issues JWT tokens.
- Stores user details and GitHub tokens in MongoDB.
- **Tech**: Express + MongoDB (Atlas).
### 3. **Payment Service**
- Handles small payments/donations (`₹10/project` ).
- Integrates with PhonePe / Razorpay.
- Marks project as "paid" in DB.
- **Tech**: Express + Payment SDK.
### 4. **Repo Fetch Service**
- Clones GitHub repositories using stored OAuth token.
- Handles both private & public repos.
- Passes code to Build Service via Kafka.
- **Tech**: Node.js worker + Kafka + EFS (shared storage).
### 5. **Build Service**
- Runs builds inside isolated Docker containers.
- Executes commands (`npm install && npm run build` ).
- Uploads build artifacts to S3.
- Publishes build success/failure events.
- **Tech**: Docker + Kafka + Node.js worker.
### 6. **Deployment / Preview Service**
- Maps user projects → preview URL (`project123.dumcel.com` ).
- Stores metadata in MongoDB.
- Serves projects from S3 + CloudFront.
- **Tech**: AWS S3 + CloudFront.
### 7. **Analytics Service**
- Tracks visits, builds, deployments, and errors.
- Consumes events from Kafka.
- Stores counters in Redis, aggregates in MongoDB.
- **Tech**: Kafka + Redis + MongoDB.
---

## Event Flow
1. User logs in → **Auth Service (GitHub OAuth)**.
2. User adds repo → **Repo Fetch Service clones repo**.
3. Repo fetched → publishes `REPO_CLONED`  event in Kafka.
4. **Build Service** consumes event → builds → uploads to S3.
5. Build finished → publishes `BUILD_SUCCESS`  event.
6. **Deployment Service** updates DB with preview URL.
7. Proxy routes `*.dumcel.com`  traffic → CloudFront → S3.
8. **Analytics Service** logs build/deploy/visit events.
9. **Payment Service** validates optional donation before deploy.
---

## Infrastructure
- **AWS EC2/ECS** → microservices
- **AWS S3 + CloudFront** → project hosting
- **AWS Route 53** → domain + wildcard subdomains
- **MongoDB Atlas** → user + project metadata
- **ElastiCache (Redis)** → caching + analytics counters
- **MSK (Kafka)** → event-driven pipelines
---

## Resume Pitch
- "Built a **Vercel-like deployment platform** with microservices, supporting GitHub login, project deployments, payments, and analytics. Designed with **Kafka-based event pipelines, Dockerized build workers, and AWS infra (EC2, S3, CloudFront, Route 53)**."


