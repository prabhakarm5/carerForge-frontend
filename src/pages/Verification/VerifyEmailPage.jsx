import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL, API } from "../../config/api";

function VerifyEmailPage() {

    const navigate = useNavigate();

    const [searchParams] = useSearchParams();

    const called = useRef(false);

    useEffect(() => {

        if (called.current) {
            return;
        }

        called.current = true;

        async function verifyEmail() {

            try {

                const token =
                    searchParams.get("token");

                await axios.get(

                    API_BASE_URL +
                    API.AUTH.VERIFY_EMAIL +
                    "?token=" +
                    token

                );

                navigate(
                    "/verification-success"
                );

            }

            catch (error) {

                navigate(
                    "/verification-failed"
                );

            }

        }

        verifyEmail();

    }, []);

    return (

        <div className="min-h-screen bg-slate-950 flex justify-center items-center">

            <h1 className="text-white text-3xl">

                Verifying Email...

            </h1>

        </div>

    );

}

export default VerifyEmailPage;