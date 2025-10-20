import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'
import { VerifyOtpForm } from '@/components/verify-otp-form'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import React from 'react'

const page = async () => {
    const cookiesStore = await cookies();
    const otpSent = cookiesStore.get('otpSent')?.value;
    const email = cookiesStore.get('otpEmail')?.value;

    if (!otpSent || !email) return redirect('/forget-password');
    return (
        <>
            <Navbar />
            <div className="flex min-h-[80vh] w-full items-center justify-center p-6 md:p-10">
                <div className="w-full max-w-sm">
                    <VerifyOtpForm email={email!} />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default page