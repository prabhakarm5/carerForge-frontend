import { Search, X } from "lucide-react";

function ImageSearchBar({

    keyword,

    setKeyword

}) {

    return (

        <div

            className="

            sticky

            top-0

            z-20

            bg-[#0B1120]

            pb-4

            "

        >

            <div

                className="

                flex

                items-center

                rounded-2xl

                border

                border-slate-800

                bg-slate-900

                px-4

                py-3

                transition-all

                duration-300

                focus-within:border-violet-500

                focus-within:ring-2

                focus-within:ring-violet-500/20

                "

            >

                <Search

                    size={18}

                    className="

                    text-slate-500

                    "

                />

                <input

                    value={keyword}

                    onChange={(e)=>

                        setKeyword(

                            e.target.value

                        )

                    }

                    placeholder="Search images..."

                    className="

                    flex-1

                    bg-transparent

                    px-3

                    text-sm

                    text-white

                    placeholder:text-slate-500

                    outline-none

                    "

                />

                {

                    keyword &&

                    <button

                        onClick={()=>

                            setKeyword("")

                        }

                        className="

                        rounded-full

                        p-1

                        hover:bg-slate-800

                        "

                    >

                        <X

                            size={16}

                            className="

                            text-slate-400

                            "

                        />

                    </button>

                }

            </div>

        </div>

    );

}

export default ImageSearchBar;