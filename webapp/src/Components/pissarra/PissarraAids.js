import { useEffect, useState } from "react";
import './PissarraAids.css'
import WatchersModal from "./watchers/WatchersModal";
import Pressable from "../other/Pressable";
import WatchersPreview from "./watchers/WatchersPreview";
import { isDesktop, isMobile } from "react-device-detect";
import { ProfilePic } from "./watchers/UserList";

function PissarraAids(props) {
    const { castellersInfo, caixaSelected, posicions, socket, ajuntament, rotationVal, extended, hideAjuntament, setHideAjuntament, setAjuntament, selectedEvent, selectedBundle, selectedVersio, readonly } = props;
    const position = ['top', 'right', 'bottom', 'left'][(ajuntament + Math.round(rotationVal/90))%4]

    const room = `${selectedEvent}.${selectedBundle}.${selectedVersio}`

    const [watcherCount, setWatcherCount] = useState(0);
    const [closedWatcherPopup, setClosedWatcherPopup] = useState(true);
    const [watcherInfo, setWatcherInfo] = useState(null)

    const userDevices = watcherInfo ?
        watcherInfo
            .reduce((acc, val) => (acc[val] = (acc[val] || 0) + 1, acc), {}) :
        []

    const selectedUser = caixaSelected ? posicions.caixes[caixaSelected] : null
    const selectedUserName = castellersInfo?.[selectedUser]?.mote || castellersInfo?.[selectedUser]?.nom || ''

    useEffect(() => {
        socket.emit('.request_watcher_info', room)
        socket.on('.watcher_info', (roomId, info) => roomId === room && setWatcherInfo(info))
        return () => socket.off('.watcher_info')
    }, [closedWatcherPopup])

    useEffect(() => {
        const room = `${selectedEvent}.${selectedBundle}.${selectedVersio}`
        socket.emit('.request_watcher_count', room)

        socket.on('.ajuntament_rotated', val => setAjuntament(val))

        socket.on('.new_watcher', (roomId) => {
            if (roomId === room) {
                socket.emit('.request_watcher_count', room)
                socket.emit('.request_watcher_info', room)
            }
        })

        socket.on('.end_watcher', (roomId) => {
            if (roomId === room) {
                socket.emit('.request_watcher_count', room)
                socket.emit('.request_watcher_info', room)
            }
        })

        socket.on('.watcher_count', (roomId, n) => roomId === room && setWatcherCount(n))

        return () => {
            socket.off('.watcher_count');
            socket.off('.ajuntament_rotated');
            socket.off('.new_watcher');
            socket.off('.end_watcher');
        }
    }, [])

    const [lastTimeout, setLastTimeout] = useState(null)

    useEffect(() => {
        if (!readonly) {
            clearTimeout(lastTimeout)
            const timeoutid = setTimeout(() => setHideAjuntament(true), 2000)
            setLastTimeout(timeoutid)
        }
    }, [hideAjuntament])

    return (<>
        <WatchersModal
            closed={closedWatcherPopup}
            setClosed={setClosedWatcherPopup}
            socket={socket}
            userDevices={userDevices}
            {...props}
        />
        <div style={{ zIndex: 99999 }}>
            { ((readonly || !hideAjuntament) && ajuntament !== null) && <div onClick={() => setHideAjuntament(true)} className={`ajuntament ${position} ${extended ? 'extended' : ''}`}>
                🏛️
            </div> }

            { true && <div className="watcherCount">
                <Pressable
                    onClick={() => setClosedWatcherPopup(false)}
                    style={{
                        padding: 10,
                        display: 'flex',
                        justifyContent: 'space-around',
                        alignItems: 'center',
                        backgroundColor: 'transparent',
                        borderRadius: 10,
                    }}
                >
                    <WatchersPreview
                        userDevices={userDevices}
                        {...props}
                    />
                </Pressable>
            </div> }

            {
                isDesktop && selectedUser && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 75,
                            left: 15,
                        }}
                    >
                        <ProfilePic
                            user={selectedUser}
                            width={150}
                            height={150}
                            rounded={false}
                            touchToEnlarge={true}
                        />
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'center',
                                margin: 10,
                            }}
                        >
                            <div
                                style={{
                                    backgroundColor: '#eee',
                                    padding: 5,
                                    paddingLeft: 10,
                                    paddingRight: 10,
                                    borderRadius: 5,
                                }}
                            >
                                {selectedUserName}
                            </div>
                        </div>
                    </div>
                )
            }

            {
                isMobile &&
                <Pressable
                    style={{
                        position: 'absolute',
                        top: 15,
                        left: 15,
                        fontSize: 24,
                        padding: 10,
                        backgroundColor: '#eee',
                        borderRadius: 10,
                    }}
                    onClick={() => {
                        window.location.href = '/'
                    }}
                >
                    ⬅️
                </Pressable>
            }
        </div>
    </>)
}

export default PissarraAids;