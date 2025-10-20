export interface ProjectType {
    _id: string,
    projectName: string,
    userId: string,
    gitUrl: string,
    subDomain: string,
    createdAt: string,
    updatedAt?: string,
    deployment: {
        latestDeploymentId?: string,
        state?: DeploymentState,
    }
}

export enum DeploymentState {
    QUEUED = "queued",
    NOT_STARTED = "not started",
    IN_PROGRESS = "in progress",
    READY = "ready",
    FAILED = "failed",
}

export interface DeploymentType {
    _id: string,
    projectId: string,
    projectName: string,
    subDomain: string,
    state: DeploymentState,
    createdAt: Date,
    updatedAt?: Date
}

// VITE_API_URL=https://dummyjson.com