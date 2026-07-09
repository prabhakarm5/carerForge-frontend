export function handleApiError(error) {

    const status = error.response?.status;

    const message = (

        error.response?.data?.message ||

        ""

    ).toLowerCase();

    if (

        status === 400 &&

        (

            message.includes("insufficient") ||

            message.includes("token")

        )

    ) {

        return;

    }

    toast.error(

        error.response?.data?.message ||

        "Something went wrong"

    );

}