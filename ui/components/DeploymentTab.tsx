"use client";

import { DeploymentType } from "@/types";
import { useEffect, useState } from "react";
import { Skeleton } from "./ui/skeleton";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { DataTable } from "./data-table";
import { DeploymentColumns } from "@/app/(root)/dashboard/DeploymentsColumns";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const DeploymentTab = ({ projectId }: { projectId?: string }) => {
    const [deployments, setDeployments] = useState<DeploymentType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [stateFilter, setStateFilter] = useState<string>("all");
    const [pagination, setPagination] = useState<{
        hasNextPage: boolean;
        hasPrevPage: boolean;
        page: number;
        totalPages: number;
    }>({
        hasNextPage: false,
        hasPrevPage: false,
        page: 1,
        totalPages: 1,
    });

    const fetchDeployments = async (pageNum = 1, state = "all") => {
        try {
            const token = localStorage.getItem("token");
            setLoading(true);

            const stateQuery =
                state !== "all" ? `&state=${encodeURIComponent(state)}` : "";

            const url = process.env.NEXT_PUBLIC_BASE_URL +
                (projectId
                    ? `/project/get-all-deployments/${projectId}?page=${pageNum}&limit=${limit}${stateQuery}`
                    : `/project/get-all-deployments?page=${pageNum}&limit=${limit}${stateQuery}`);

            const res = await fetch(url, {
                method: "GET",
                headers: {
                    Authorization: "Bearer " + token,
                    "Content-Type": "application/json",
                },
            });

            if (!res.ok) {
                setLoading(false);
                return setError("Something went wrong while fetching deployments.");
            }

            const deploymentsJson = await res.json();

            const mappedDeployments: DeploymentType[] =
                (deploymentsJson?.data?.deployments || []).map((d: any) => ({
                    _id: d._id,
                    projectId: d.projectId?._id || "",
                    projectName: d.projectId?.projectName || "",
                    subDomain: d.projectId?.subDomain || "",
                    state: d.state,
                    createdAt: new Date(d.createdAt),
                    updatedAt: d.updatedAt ? new Date(d.updatedAt) : undefined,
                }));

            setDeployments(mappedDeployments);
            setPagination({
                hasNextPage: deploymentsJson?.data?.pagination?.hasNextPage || false,
                hasPrevPage: deploymentsJson?.data?.pagination?.hasPrevPage || false,
                page: deploymentsJson?.data?.pagination?.page || 1,
                totalPages: deploymentsJson?.data?.pagination?.totalPages || 1,
            });
            setLoading(false);
        } catch (error: unknown) {
            setLoading(false);
            setError(error instanceof Error ? error.message : "Something went wrong");
        }
    };

    useEffect(() => {
        fetchDeployments(page, stateFilter);
    }, [page, stateFilter]);

    const handlePrev = () => {
        if (pagination.hasPrevPage) setPage((prev) => prev - 1);
    };

    const handleNext = () => {
        if (pagination.hasNextPage) setPage((prev) => prev + 1);
    };

    if (loading) {
        return (
            <div className="w-full min-h-[75vh] space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="w-full h-14 rounded-md shadow-sm" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full min-h-[75vh] flex items-center justify-center">
                <h1 className="text-red-500">{error}</h1>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="w-full space-y-4 flex flex-col md:flex-row md:items-center md:justify-between">
                <h1 className="text-lg md:text-3xl font-bold text-foreground">
                    {!projectId && "Recent Deployments By You"}
                    {projectId && "All Deployments of this project"}
                </h1>

                {/* State Filter Dropdown */}
                <div className="flex items-center gap-2">
                    <Label htmlFor="stateFilter" className="text-sm text-gray-400">
                        Filter by state:
                    </Label>
                    <Select
                        value={stateFilter}
                        onValueChange={(value) => {
                            setStateFilter(value);
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="w-[180px] bg-background border-gray-700">
                            <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="ready">Ready</SelectItem>
                            <SelectItem value="in progress">In Progress</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="queued">Queued</SelectItem>
                            <SelectItem value="not started">Not Started</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="w-full flex min-h-[70vh] items-center justify-between flex-col gap-5">
                <div className="w-full mt-5">
                    {deployments.length === 0 ? (
                        <div className="w-full flex items-center justify-center">
                            <h1>No Deployments Found</h1>
                        </div>
                    ) : (
                        <DataTable columns={DeploymentColumns} data={deployments} />
                    )}
                </div>

                {pagination.totalPages > 1 && (
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handlePrev();
                                    }}
                                    className={
                                        pagination.hasPrevPage
                                            ? ""
                                            : "opacity-50 pointer-events-none"
                                    }
                                />
                            </PaginationItem>

                            {Array.from({ length: pagination.totalPages }).map((_, i) => {
                                const pageNum = i + 1;
                                return (
                                    <PaginationItem key={pageNum}>
                                        <PaginationLink
                                            href="#"
                                            isActive={pagination.page === pageNum}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                setPage(pageNum);
                                            }}
                                        >
                                            {pageNum}
                                        </PaginationLink>
                                    </PaginationItem>
                                );
                            })}

                            <PaginationItem>
                                {pagination.totalPages > 3 && <PaginationEllipsis />}
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationNext
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleNext();
                                    }}
                                    className={
                                        pagination.hasNextPage
                                            ? ""
                                            : "opacity-50 pointer-events-none"
                                    }
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                )}
            </div>
        </div>
    );
};

export default DeploymentTab;
