import { FaGoogle, FaGithub } from "react-icons/fa";

function SocialRegister() {

    return (

        <div className="space-y-4">

            <button className="w-full bg-white rounded-xl p-4 flex items-center justify-center gap-3">

                <FaGoogle />

                Continue with Google

            </button>

            <button className="w-full bg-slate-800 text-white rounded-xl p-4 flex items-center justify-center gap-3">

                <FaGithub />

                Continue with GitHub

            </button>

        </div>

    );

}

export default SocialRegister;