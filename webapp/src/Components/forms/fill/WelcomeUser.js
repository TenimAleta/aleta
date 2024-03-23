function WelcomeUser({ userId, isLogged, castellersInfo }) {
    const displayName = castellersInfo?.[userId]?.mote || castellersInfo?.[userId]?.nom || userId;

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            <h1>
                {
                    isLogged ? (
                        <>
                            Hola, {displayName}!
                        </>
                    ) : (
                        <>
                            Hola, visitant!
                        </>
                    )
                }
            </h1>
        </div>
    )
}

export default WelcomeUser;