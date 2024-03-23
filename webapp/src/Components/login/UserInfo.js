import React, { useCallback, useEffect, useState } from 'react';
import { getSubdomain } from '../../utils/utils';
import { downloadImage } from '../../utils/upload-image';
import { logoutUser } from '../../utils/login';
const COLLA = getSubdomain();

async function save2CacheImage(userId, base64) {
    try {
      // Create a new Cache object or open an existing one
      const cache = await caches.open(`${COLLA}.images`);
      
      // Add the fetched image to the cache
      await cache.put(userId, base64);

      return true;
    } catch (error) {
      console.error('Error caching image:', error);
    }

    return false;
}  

async function getImageFromCache(userId) {
    try {
      // Open the cache
      const cache = await caches.open(`${COLLA}.images`);
  
      // Get the image from the cache
      const response = await cache.match(userId);
  
      if (!response) {
        throw new Error('Image not found in cache');
      }
  
      // Read the response as Blob
      const blob = await response.blob();

      return URL.createObjectURL(blob);
    } catch (error) {
        console.error('Error getting image from cache:', error);
    }

    return false;
}

function UserInfo({ socket, userId, userInfo, setUserInfo, castellersInfo }) {
    const [profilePic, setProfilePic] = useState(null);

    const downloadProfilePic = useCallback(async () => {
        try {
            const base64 = await downloadImage(userId, COLLA);
            setProfilePic(base64);
            // save2CacheImage(userId, base64)
        } catch (e) {
            setProfilePic(false);
        }
    }, [userId]);

    useEffect(() => {
        if (!userId) return;

        // // Get from cache
        // getImageFromCache(userId)
        //     .then(base64 => setProfilePic(base64))
        //     .catch(e => console.log(e))
        
        // Get from server
        downloadProfilePic()
    }, [
        userId
    ])

    useEffect(() => {
        if (!userId || !castellersInfo) return;
        if (Object.keys(castellersInfo).length === 0) return;

        if (castellersInfo[userId] === undefined) {
            alert('Usuari no trobat a la base de dades. Es tancarà la sessió.')
            logoutUser()
        } else if (castellersInfo[userId].es_junta === 0 && castellersInfo[userId].es_tecnica === 0) {
            alert('No tens permisos per accedir a aquesta pàgina. Es tancarà la sessió.')
            logoutUser()
        } else {
            setUserInfo(castellersInfo[userId])
        }
    }, [
        castellersInfo,
        userId,
    ])

    const styles = {
        user_info: {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'flex-start',
            gap: '1em',
            alignItems: 'center',
            margin: 20,
            marginBottom: '1em',
        },
        label: {
            backgroundColor: 'darkblue',
            color: 'white',
            padding: '0.5em',
            borderRadius: '0.5em',
            fontSize: '0.8em'
        },
        user_img: {
            width: 100,
            height: 100,
            objectFit: 'cover',
            objectPosition: 'center',
            borderRadius: 20,
        },
        user_info_item: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
        }
    }

    const displayName = (userInfo) => {
        const { mote, nom } = userInfo

        if (mote && mote.length < 10) return mote
        else if (nom && nom.length < 10) return nom
        else return nom.slice(0, 10)
    }
    
    return !(userInfo && Object.keys(userInfo).length > 0) ? (
        <div style={styles.user_info}>
            {
                profilePic === null ? <></> :
                <div style={styles.user_info_item}>
                    <div
                        style={{...styles.user_img, ...{ backgroundColor: '#ccc' }}}
                        src={'https://via.placeholder.com/200x200.png?text=...'}
                    />
                </div>
            }
            <div style={styles.user_info_item}>
                <h1 style={{ marginTop: 0, marginBottom: 20 }}>
                    ...
                </h1>

                <div style={{ display: 'flex', gap: 10 }}>
                    <span style={{...styles.label, ['backgroundColor']: '#ccc' }}>
                        ...
                    </span>
                </div>
            </div>
        </div>
    ) : (
        <div style={styles.user_info}>
            {
                profilePic === null ? <></> :
                <div style={styles.user_info_item}>
                    <img
                        style={styles.user_img}
                        src={
                            profilePic === null ? 'https://via.placeholder.com/200x200.png?text=Carregant...' :
                            !profilePic ? 'https://via.placeholder.com/200x200.png?text=Sense+foto' :
                            profilePic
                        }
                        onClick={() => {
                            const confirmLogout = window.confirm('Vols tancar la teva sessió?');
                            if (confirmLogout) {
                                logoutUser();
                                window.location.reload();
                            }
                        }}
                    />
                </div>
            }
            <div style={styles.user_info_item}>
                <h1 style={{ marginTop: 0, marginBottom: 20 }}>
                    Hola, {displayName(userInfo)}!
                </h1>

                <div style={{ display: 'flex', gap: 10 }}>
                    { userInfo.es_tecnica === 2 && <span style={{...styles.label, ['backgroundColor']: 'darkorange' }}>Cap de tècnica</span> }
                    { userInfo.es_tecnica === 1 && <span style={{...styles.label, ['backgroundColor']: 'darkblue' }}>Membre de tècnica</span> }
                    { userInfo.es_junta === 2 && <span style={{...styles.label, ['backgroundColor']: 'darkviolet' }}>Cap de junta</span> }
                    { userInfo?.es_junta === 1 && <span style={{...styles.label, ['backgroundColor']: 'darkgreen' }}>Membre de junta</span> }
                </div>
            </div>
        </div>
    )
}

export default UserInfo;