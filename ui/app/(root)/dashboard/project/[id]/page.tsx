import BuildLogsContainer from '@/components/build-logs-container';
import DeployProjectForm from '@/components/DeployProjectForm';
import { Button } from '@/components/ui/button';
import { ProjectType } from '@/types';
import { BrickWall, ExternalLink, Github, Pencil } from 'lucide-react';
import { cookies } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react'

const page = async ({ params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const cookiesStore = await cookies();
    const token = cookiesStore.get('token')?.value;

    if (!token) {
        return (
            <div className="p-10 text-center text-red-400">
                Unauthenticated — please log in.
            </div>
        );
    }

    let project: ProjectType | null = null;
    let error: string | null = null;

    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/project/getProject/${id}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            cache: 'no-store',
        });

        if (!res.ok) throw new Error(`Failed to fetch project (${res.status})`);

        const json = await res.json();
        if (json.status !== 'success') throw new Error(json.error || 'Unexpected error');

        project = json.project;
    } catch (err: unknown) {
        error = err instanceof Error ? err.message : 'Something went wrong.';
    }


    if (error || !project) {
        return (
            <div className="p-10 text-center text-red-400">
                {error || 'Project not found.'}
            </div>
        );
    }

    // Map state colors
    const state = project.deployment?.state || 'not started'; // Replace with real state if available
    const bgClassMap: Record<string, string> = {
        'not started': 'bg-gray-800 ring-gray-500',
        queued: 'bg-blue-500 ring-blue-500',
        'in progress': 'bg-yellow-500 ring-yellow-500',
        ready: 'bg-green-500 ring-green-500',
        failed: 'bg-red-500 ring-red-500',
    };
    const bgClass = bgClassMap[state] || 'bg-gray-600';

    return (
        <div className='w-full p-5 bg-background'>

            <div className='w-full py-6 flex items-start md:items-center justify-between flex-col lg:flex-row gap-5'>
                <h1 className='text-lg md:text-2xl font-semibold leading-normal capitalize'>{project?.projectName}</h1>

                <div className='flex items-center gap-4 flex-wrap'>
                    <Link href={project?.gitUrl || ""} target='_blank'>
                        <Button variant={'outline'} className='cursor-pointer flex items-center gap-2 px-2 py-1.5'>
                            <Github size={16} />
                            Repository
                        </Button>
                    </Link>

                    <Link href={`http:${project?.subDomain} ".localhost:8001"` || ""} target='_blank'>
                        <Button className='cursor-pointer flex items-center gap-2 px-2 py-0.5'>
                            <ExternalLink size={14} />
                            Live
                        </Button>
                    </Link>
                </div>
            </div>

            <div className='w-full py-10 flex items-center justify-between gap-4 flex-wrap'>
                <h1 className='text-lg md:text-2xl font-semibold leading-normal capitalize'>Production Deployment</h1>
                <Link href={project?.gitUrl || ""} target='_blank'>
                    <Button variant={'outline'} className='cursor-pointer flex items-center gap-2 px-2 py-1.5'>
                        <BrickWall size={16} />
                        Build Logs
                    </Button>
                </Link>
            </div>

            <div className='w-full p-3 rounded-md bg-gray-100/5 border border-gray-300/20 grid grid-cols-1 md:grid-cols-2'>
                <div className='w-full aspect-video rounded-lg overflow-hidden border border-gray-300/20'>
                    <Image
                        alt='Preview'
                        width={100}
                        unoptimized
                        height={100}
                        className='w-full h-full object-cover transition-transform duration-300 hover:scale-[1.02]'
                        src={'https://placehold.co/600x400?text=Preview'}
                    />
                </div>

                <div className='w-full py-10 px-6 space-y-6'>
                    {/* Deployment */}
                    <div className='space-y-1.5'>
                        <h5 className='text-xs capitalize tracking-wide text-gray-400 font-normal'>
                            Deployment
                        </h5>
                        <Link
                            href={`http://${project?.subDomain}.localhost:8001`}
                            target='_blank'
                            className='text-base text-white font-medium hover:text-gray-200 flex items-center gap-2 transition-colors'
                        >
                            {`http://${project?.subDomain}.localhost:8001`}
                            <ExternalLink size={14} className='opacity-70' />
                        </Link>
                    </div>

                    {/* Status */}
                    <div className='space-y-1.5'>
                        <h5 className='text-xs capitalize tracking-wide text-gray-400 font-normal'>
                            Status
                        </h5>
                        <div className='flex items-center gap-2'>
                            <span className={`p-1 ring-2 rounded-full ${bgClass} shadow-sm`} />
                            <p className='capitalize text-sm text-gray-200 font-semibold tracking-wide'>
                                {state}
                            </p>
                        </div>
                    </div>

                    {/* Created On */}
                    <div className='space-y-1.5'>
                        <h5 className='text-xs capitalize tracking-wide text-gray-400 font-normal'>
                            Last Updated On
                        </h5>
                        <p className='text-sm text-gray-100 font-medium'>
                            {project?.updatedAt
                                ? new Date(project?.updatedAt).toLocaleString('en-US', {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                })
                                : ''}
                        </p>
                    </div>

                    {/* Button */}
                    <div className='flex items-center gap-5 flex-wrap'>
                        <Link href={`/dashboard/project/${project._id}/deployments`}>
                            <Button
                                variant='outline'
                                className='cursor-pointer flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border-gray-500/40 hover:bg-gray-100/10 transition-colors'
                            >
                                All Deployments
                            </Button>
                        </Link>
                        <Link href={project?.gitUrl || ''} target='_blank'>
                            <Button
                                className='cursor-pointer flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border-gray-500/40 hover:bg-gray-100/80 transition-colors'
                            >
                                Change Subdomain
                                <Pencil size={12} />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            <div className='w-full mt-2 space-y-3.5 bg-gray-100/5 rounded-md border border-gray-300/20 p-3'>
                <DeployProjectForm projectId={id} />
            </div>

            <div className='w-full mt-2 space-y-3.5 bg-gray-100/5 rounded-md border border-gray-300/20 p-3'>
                <div className='w-full'>
                    <h1 className='text-lg md:text-2xl font-semibold leading-normal capitalize'>Latest Build Logs</h1>
                </div>
                {project?.deployment?.latestDeploymentId ? (
                    <BuildLogsContainer deploymentId={project.deployment?.latestDeploymentId} />
                ) : null}
            </div>
        </div>
    )
}

export default page