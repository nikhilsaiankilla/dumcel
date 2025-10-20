"use client"

import React, { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { ArrowRightCircle, EllipsisIcon, Github, Trash } from 'lucide-react'
import Link from 'next/link'
import { ProjectType } from '@/types'
import { Button } from './ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const ProjectCard = ({ project, onDelete }: { project: ProjectType, onDelete: (id: string) => void }) => {
    const [loading, setLoading] = useState<boolean>(false);

    const deleteProject = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            setTimeout(async () => {
                const res = await fetch(process.env.NEXT_PUBLIC_BASE_URL + `/project/delete/${project._id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    }
                })

                if (!res.ok) {
                    setLoading(false);
                    console.log(res);
                    return;
                }

                const json = await res.json();
                onDelete(project._id)
                setLoading(false);
            }, 1000)
        } catch (error) {
            setLoading(false);
        }
    }


    return (
        <div
            key={project._id}
            className={`p-4 relative space-y-3 border-[0.5px] transition-all duration-200 ease-in-out bg-background/5 rounded-md shadow-sm
                ${loading ? 'border-red-500/40' : 'border-gray-300/20 hover:border-gray-300/55'}`}
        >
            <div className='w-full flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                    <Avatar>
                        <AvatarImage src="https://github.com/shadcn.png" />
                        <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                    <div className='flex flex-col space-y-1'>
                        <h3 className="font-semibold text-sm">{project.projectName}</h3>
                        <Link href={project.subDomain + ".localhost:3000"} target='_blank' className="text-sm text-muted-foreground">{project.subDomain + ".localhost:3000"}</Link>
                    </div>
                </div>

                <div className='flex items-center gap-4'>
                    <span className='p-2 rounded-lg hover:bg-gray-300/20 transition-all duration-150 ease-in-out'>
                        <DropdownMenu>
                            <DropdownMenuTrigger>
                                <EllipsisIcon />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end'>
                                <DropdownMenuLabel onClick={deleteProject} className='cursor-pointer flex items-center gap-2 hover:text-red-500 capitalize duration-150 ease-in-out'>
                                    <Trash size={14}/>
                                    Delete
                                </DropdownMenuLabel>
                                {/* <DropdownMenuSeparator />
                                <DropdownMenuItem>Profile</DropdownMenuItem>
                                <DropdownMenuItem>Billing</DropdownMenuItem>
                                <DropdownMenuItem>Team</DropdownMenuItem>
                                <DropdownMenuItem>Subscription</DropdownMenuItem> */}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </span>
                </div>
            </div>

            <div className='w-fit pl-1.5 pr-3 py-0.5 rounded-full gap-2 flex items-center justify-center bg-gray-700/50'>
                <span className='p-1.5 bg-black/50 rounded-full'>
                    <Github size={14} />
                </span>
                <Link href={project.gitUrl} target='_blank' className='text-xs text-white'>
                    {project.gitUrl.replace(/^https:\/\/(www\.)?github\.com\//, '')}
                </Link>
            </div>

            <div className='w-full'>
                <h3 className="text-sm text-muted-foreground">
                    {
                        project.updatedAt ?
                            <>
                                Updated At: {new Date(project.updatedAt).toLocaleDateString('us-en', {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric'
                                })}</>
                            :
                            <>
                                Created At: {project.createdAt}
                            </>
                    }
                </h3>
            </div>

            <div className='flex items-center gap-2 flex-wrap'>
                <Link href={`/dashboard/project/${project._id}`}>
                    <Button variant={'outline'} className='flex items-center gap-2.5 cursor-pointer disabled:bg-gray-300/20' disabled={loading}>
                        Open Project <ArrowRightCircle />
                    </Button>
                </Link>
            </div>
        </div>
    )
}

export default ProjectCard