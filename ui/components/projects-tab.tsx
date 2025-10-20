"use client"

import { ProjectType } from "@/types";
import { useEffect, useState } from "react";
import ProjectCard from "./project-card";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import { Skeleton } from "./ui/skeleton";
import AddProjectBtn from "./add-project-btn";

const ProjectsTab = () => {
    const [projects, setProjects] = useState<ProjectType[]>([])
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [limit] = useState(6);
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

    useEffect(() => {
        const fetchProjects = async (pageNum = 1) => {
            try {
                setLoading(true);
                const token = localStorage.getItem('token');
                const res = await fetch(process.env.NEXT_PUBLIC_BASE_URL + `/project/get-all-projects?page=${pageNum}&limit=${limit}`, {
                    method: "GET",
                    headers: {
                        "Authorization": "Bearer " + token,
                        "Content-Type": "application/json"
                    }
                })

                if (!res.ok) {
                    setLoading(false)
                    return setError("Something went Wrong")
                }

                const projectsJson = await res.json();

                setProjects(projectsJson?.data?.projects || [])
                setPagination({
                    hasNextPage: projectsJson?.data?.pagination?.hasNextPage || false,
                    hasPrevPage: projectsJson?.data?.pagination?.hasPrevPage || false,
                    page: projectsJson?.data?.pagination?.page || 1,
                    totalPages: projectsJson?.data?.pagination?.totalPages || 1,
                });
                setLoading(false)
            } catch (error: unknown) {
                setLoading(false)
                setError(error instanceof Error ? error.message : "Failed to load projects");
            }
        }
        fetchProjects(page)
    }, [page])

    const handlePrev = () => {
        if (pagination.hasPrevPage) setPage((prev) => prev - 1);
    };

    const handleNext = () => {
        if (pagination.hasNextPage) setPage((prev) => prev + 1);
    };

    if (loading) {
        return (
            <div className="w-full min-h-[75vh] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Skeleton className="w-full h-44 rounded-md shadow-sm" />
                <Skeleton className="w-full h-44 rounded-md shadow-sm" />
                <Skeleton className="w-full h-44 rounded-md shadow-sm" />
                <Skeleton className="w-full h-44 rounded-md shadow-sm" />
                <Skeleton className="w-full h-44 rounded-md shadow-sm" />
                <Skeleton className="w-full h-44 rounded-md shadow-sm" />
                <Skeleton className="w-full h-44 rounded-md shadow-sm" />
                <Skeleton className="w-full h-44 rounded-md shadow-sm" />
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

    const deleteProjectHander = (id: string) => {
        setProjects((prev) => prev.filter(({ _id }) => _id !== id))
    }

    return (
        <div className="w-full min-h-[75vh] flex items-center justify-between flex-col">
            <div className="w-full">
                {projects.length === 0 ? (
                    <div className="w-full">
                        <span className="w-full max-w-xs">
                            <AddProjectBtn />
                        </span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <>
                            <AddProjectBtn />
                        </>
                        {projects.map((project: ProjectType) => (
                            <ProjectCard project={project} key={project._id} onDelete={(id) => deleteProjectHander(id)} />
                        ))}
                    </div>
                )}
            </div>
            {
                pagination.totalPages > 1 && (
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handlePrev();
                                    }}
                                    className={pagination.hasPrevPage ? "" : "opacity-50 pointer-events-none"}
                                />
                            </PaginationItem>
                            {/* Render numbered page links */}
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
                                    className={pagination.hasNextPage ? "" : "opacity-50 pointer-events-none"}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                )
            }
        </div >
    )
}

export default ProjectsTab