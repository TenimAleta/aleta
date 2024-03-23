import { ProfilePic } from "./UserList";

function WatchersPreview({ userDevices, userId }) {
    const sortedUserDevices = Object.entries(userDevices).sort(([user1, devices1], [user2, devices2]) => {
        // Own user last
        if (parseInt(user1) === parseInt(userId)) return 1;
        if (parseInt(user2) === parseInt(userId)) return -1;

        // Sort by number of devices
        if (devices1 > devices2) return -1;
        if (devices1 < devices2) return 1;

        return 0;
    })

    return (<>
        <div
            style={{
                height: 30,
                width: 32 + 7 * Math.min(3, sortedUserDevices.length),
                display: 'flex',
                flexDirection: 'row',
            }}
        >
            {
                sortedUserDevices
                .slice(0, 3)
                .map(([user, devices], i) => {
                    return (
                        <div
                            key={user}
                            style={{
                                position: 'absolute',
                                left: 7 + i * 10,
                                zIndex: 99999 - i,
                            }}
                        >
                            <ProfilePic
                                user={user}
                                width={30}
                                height={30}
                            />
                        </div>
                    )
                })
            }
        </div>
        <div>
            {Object.keys(userDevices).length} 👁️
        </div>
    </>)
}

export default WatchersPreview;