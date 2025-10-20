import Footer from "@/components/Footer"
import { LoginForm } from "@/components/login-form"
import Navbar from "@/components/Navbar"

export default function Page() {
    return (
        <>
            <Navbar />
            <div className="flex min-h-[80vh] w-full items-center justify-center p-6 md:p-10">
                <div className="w-full max-w-sm">
                    <LoginForm />
                </div>
            </div>
            <Footer />
        </>
    )
}
