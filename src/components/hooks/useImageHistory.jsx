import { useCallback, useEffect, useMemo, useState } from "react";

import {
    getImageHistory,
    deleteImage,
    toggleFavorite
} from "../services/imageService";

import toast from "react-hot-toast";

export default function useImageHistory() {

    const [history, setHistory] = useState([]);

    const [loading, setLoading] = useState(true);

    const [keyword, setKeyword] = useState("");

    const loadHistory = useCallback(async () => {

        try {

            setLoading(true);

            const response = await getImageHistory();

            setHistory(response);

        }

        catch {

            toast.error("Unable to load images");

        }

        finally {

            setLoading(false);

        }

    }, []);

    useEffect(() => {

        loadHistory();

    }, [loadHistory]);

    async function removeImage(id) {

        try {

            await deleteImage(id);

            setHistory(old =>

                old.filter(image =>

                    image.id !== id

                )

            );

            toast.success("Image deleted");

        }

        catch {

            toast.error("Delete failed");

        }

    }

    async function favoriteImage(id) {

        try {

            await toggleFavorite(id);

            setHistory(old =>

                old.map(image =>

                    image.id === id

                        ? {
                            ...image,
                            favorite: !image.favorite
                        }

                        : image

                )

            );

        }

        catch {

            toast.error("Favorite failed");

        }

    }

    const filteredHistory = useMemo(() => {

        if (!keyword.trim()) {

            return history;

        }

        return history.filter(image =>

            image.prompt

                .toLowerCase()

                .includes(

                    keyword.toLowerCase()

                )

        );

    }, [

        history,
        keyword

    ]);

    return {

        loading,

        history: filteredHistory,

        keyword,

        setKeyword,

        loadHistory,

        removeImage,

        favoriteImage

    };

}