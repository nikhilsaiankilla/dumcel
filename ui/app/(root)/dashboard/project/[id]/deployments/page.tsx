import DeploymentTab from '@/components/DeploymentTab';
import { cookies } from 'next/headers';
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
    return (
        <div className='w-full p-5 bg-background'>
            <DeploymentTab projectId={id} />
        </div>
    )
}

export default page