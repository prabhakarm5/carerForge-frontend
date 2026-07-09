import { Link } from "react-router-dom";



function VerificationPendingPage() {

    return (

        <div className="min-h-screen bg-slate-950 flex justify-center items-center p-4">

            <div className="w-full max-w-lg bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-10 shadow-2xl text-center">

                <div className="text-7xl mb-6">

                    📧

                </div>

                <h1 className="text-4xl font-bold text-white">

                    Check Your Email

                </h1>

                <p className="text-slate-400 mt-4">

                    Verification email has been sent.

                </p>

                <p className="text-slate-400 mt-2">

                    Please verify your email within 15 minutes.

                </p>

                <div className="mt-10">

                    <Link

                        to="/login"

                        className="bg-violet-600 hover:bg-violet-700 px-8 py-4 rounded-2xl text-white font-semibold"

                    >

                        Go To Login

                    </Link>

                </div>

            </div>

        </div>

    );

}

export default VerificationPendingPage;