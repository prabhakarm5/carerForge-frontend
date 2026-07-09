import {

    Heart,
    Trash2,
    Download,
    RefreshCcw,
    MoreHorizontal

} from "lucide-react";

import { useState } from "react";

function ImageHistoryItem({

    image,

    active,

    onClick,

    onDelete,

    onFavorite,

    onRegenerate,

    onDownload

}) {

    const [

        open,

        setOpen

    ] = useState(false);

    return (

        <div

            onClick={()=>

                onClick(image)

            }

            className={`

                group

                relative

                cursor-pointer

                rounded-2xl

                border

                overflow-hidden

                transition-all

                duration-300

                hover:border-violet-500

                hover:bg-slate-900

                ${

                    active

                    ?

                    "border-violet-500 bg-slate-900"

                    :

                    "border-slate-800"

                }

            `}

        >

            {/* Thumbnail */}

            <img

                src={

                    image.storageUrl

                }

                alt={

                    image.prompt

                }

                loading="lazy"

                className="

                    h-40

                    w-full

                    object-cover

                "

            />

            {/* Content */}

            <div

                className="

                    p-3

                "

            >

                <p

                    className="

                        line-clamp-2

                        text-sm

                        font-medium

                        text-white

                    "

                >

                    {

                        image.prompt

                    }

                </p>

                <p

                    className="

                        mt-2

                        text-xs

                        text-slate-500

                    "

                >

                    {

                        new Date(

                            image.createdAt

                        ).toLocaleDateString()

                    }

                </p>

            </div>

            {/* Favorite */}

            {

                image.favorite &&

                <Heart

                    size={18}

                    className="

                        absolute

                        top-3

                        left-3

                        fill-red-500

                        text-red-500

                    "

                />

            }

            {/* Menu */}

            <button

                onClick={(e)=>{

                    e.stopPropagation();

                    setOpen(

                        !open

                    );

                }}

                className="

                    absolute

                    top-3

                    right-3

                    rounded-full

                    bg-black/60

                    p-2

                    opacity-0

                    transition

                    group-hover:opacity-100

                "

            >

                <MoreHorizontal

                    size={18}

                    className="text-white"

                />

            </button>

            {/* Dropdown */}

            {

                open &&

                <div

                    className="

                        absolute

                        right-3

                        top-14

                        z-20

                        w-48

                        rounded-xl

                        border

                        border-slate-700

                        bg-slate-900

                        shadow-2xl

                    "

                >

                    <button

                        onClick={(e)=>{

                            e.stopPropagation();

                            onFavorite(

                                image.id

                            );

                            setOpen(false);

                        }}

                        className="menu-item"

                    >

                        <Heart size={16}/>

                        Favorite

                    </button>

                    <button

                        onClick={(e)=>{

                            e.stopPropagation();

                            onDownload(

                                image.id

                            );

                            setOpen(false);

                        }}

                        className="menu-item"

                    >

                        <Download size={16}/>

                        Download

                    </button>

                    <button

                        onClick={(e)=>{

                            e.stopPropagation();

                            onRegenerate(

                                image.id

                            );

                            setOpen(false);

                        }}

                        className="menu-item"

                    >

                        <RefreshCcw size={16}/>

                        Regenerate

                    </button>

                    <button

                        onClick={(e)=>{

                            e.stopPropagation();

                            onDelete(

                                image.id

                            );

                            setOpen(false);

                        }}

                        className="

                            menu-item

                            text-red-400

                        "

                    >

                        <Trash2 size={16}/>

                        Delete

                    </button>

                </div>

            }

        </div>

    );

}

export default ImageHistoryItem;