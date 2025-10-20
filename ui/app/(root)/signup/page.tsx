import Footer from "@/components/Footer"
import Navbar from "@/components/Navbar"
import { SignupForm } from "@/components/signup-form"

export default function page() {
    return (
        <>
            <Navbar />
            <div className="flex min-h-[80vh] w-full items-center justify-center p-6 md:p-10">
                <div className="w-full max-w-sm">
                    <SignupForm />
                </div>
            </div>
            <Footer />
        </>
    )
}
