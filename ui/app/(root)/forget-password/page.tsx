import Footer from '@/components/Footer'
import { ForgetPassForm } from '@/components/forget-password'
import Navbar from '@/components/Navbar'
import React from 'react'

const page = () => {
    return (
        <>
            <Navbar />
            <div className="flex min-h-[80vh] w-full items-center justify-center p-6 md:p-10">
                <div className="w-full max-w-sm">
                    <ForgetPassForm />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default page