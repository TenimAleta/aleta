import { useCallback, useEffect, useState } from "react";
import { downloadImage } from "../../../utils/upload-image";
import { getSubdomain } from "../../../utils/utils";

const COLLA = getSubdomain();

export function ProfilePic({ user, width, height, rounded=true, touchToEnlarge=false }) {
    const [profilePic, setProfilePic] = useState(null);
    const [showPopup, setShowPopup] = useState(false);

    const getFromCache = useCallback(() => {
        const cachedImage = localStorage.getItem(user);
        if (cachedImage && cachedImage !== 'null') {
            return cachedImage;
        }
        return null;
    }, [user]);
    
    const saveToCache = useCallback((base64Image) => {
        if (base64Image && base64Image !== 'null') {
            try {
                localStorage.setItem(user, base64Image);
            } catch (e) {
                console.log('Error saving profile pic to cache', e);
            }
        }
    }, [user]);
    
    const downloadProfilePic = useCallback(async () => {
        try {
            let base64 = getFromCache();
            base64 = await downloadImage(user, COLLA);
            setProfilePic(base64);
            // saveToCache(base64);
        } catch (e) {
            setProfilePic(false);
        }
    }, [user, getFromCache, saveToCache]);

    useEffect(() => {
        // Get from server or cache
        downloadProfilePic();
    }, [downloadProfilePic]);

    useEffect(() => {
        setProfilePic(null);
    }, [user])

    const profile_pic_style = {
        width: width,
        height: height,
        borderRadius: rounded ? '100%' : 10,
        objectFit: 'cover',
        objectPosition: 'center',
    };

    return (
        <div
            className="author-photo"
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: touchToEnlarge ? 'pointer' : 'default'
            }}
        >
            <img
                src={
                    profilePic === null ? 'https://retchhh.files.wordpress.com/2015/03/loading1.gif' :
                    !profilePic ? 'https://forum.truckersmp.com/uploads/monthly_2019_09/imported-photo-12263.thumb.png.0a337947bd0458971e73616909a5b1f8.png' :
                    profilePic
                }
                style={{
                    ...profile_pic_style,
                    backgroundColor: profilePic ? undefined : '#ccc',
                }}
                // onError={downloadProfilePic}
                onClick={() => touchToEnlarge && setShowPopup(true)}
            />
            {showPopup && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9999,
                    cursor: 'pointer',
                }}
                onClick={() => setShowPopup(false)}
                >
                    <img
                        src={profilePic ? profilePic : 'https://forum.truckersmp.com/uploads/monthly_2019_09/imported-photo-12263.thumb.png.0a337947bd0458971e73616909a5b1f8.png'}
                        style={{
                            ...profile_pic_style,
                            width: Math.min(600, window.innerWidth*0.75),
                            height: Math.min(600, window.innerWidth*0.75),
                        }}
                    />
                </div>
            )}
        </div>
    );
}

function UserList({ userId, userDevices, castellersInfo }) {
    const userIsYou = (user) => parseInt(user) === parseInt(userId);

    return (
        <div
            style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                overflowX: 'auto',
                gap: 5,
            }}
        >
            {
                Object.entries(userDevices).map(([user, devices]) => {
                    const casteller = castellersInfo[user];
                    if (!casteller) return null;
                    return (
                        <div
                            key={user}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 5,
                                borderRadius: 10,
                                padding: 10,
                                backgroundColor: userIsYou ? '#ccc' : '#eee',
                            }}
                        >
                            <div className="user-profile-pic">
                                <ProfilePic
                                    user={user}
                                    width={50}
                                    height={50}
                                />
                            </div>
                            <div className="user-name">
                                {casteller?.mote ||`${casteller?.nom} ${casteller?.['primer-cognom']}`}
                            </div>
                            <div
                                style={{
                                    fontSize: 12,
                                }}
                            >
                                {devices} 💻
                            </div>
                        </div>
                    )
                })
            }
        </div>
    )
}

export default UserList;