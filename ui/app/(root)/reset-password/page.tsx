import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'
import { ResetPasswordForm } from '@/components/reset-passoword-form'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import React from 'react'

const page = async () => {
    const cookiesStore = await cookies();
    const otpVerified = cookiesStore.get('otpVerified')?.value;
    const passwordResetAllowed = cookiesStore.get('passwordResetAllowed')?.value;
    const email = cookiesStore.get('email')?.value;

    if (!otpVerified || !passwordResetAllowed || !email) return redirect('/forget-password');

    return (
        <>
            <Navbar />
            <div className="flex min-h-[80vh] w-full items-center justify-center p-6 md:p-10">
                <div className="w-full max-w-sm">
                    <ResetPasswordForm email={email} />
                </div>
            </div>
            <Footer />
        </>
    )
}

export default page