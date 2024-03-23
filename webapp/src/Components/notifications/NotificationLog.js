import { useEffect } from "react";
import { useState } from "react";
import { fetchAPI } from "../../utils/utils";
import { applyTimeZone } from "../interface/assistencia/LlistaAssistencies";
import moment from "moment";
import './NotificationLog.css';

function NotificationRecepients({ notifications, displayName }) {
    const [isCollapsed, setIsCollapsed] = useState(true);
    const displayNames = notifications.map(n => n.target).map(displayName);
    const initialDisplayNames = displayNames.slice(0,4);
    const remainingDisplayNames = displayNames.slice(4);

    return (
        <>
            {isCollapsed ? initialDisplayNames.join(', ') : displayNames.join(', ')}
            {remainingDisplayNames.length > 0 && 
                <a
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    style={{
                        color: 'blue',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                    }}
                >
                    {isCollapsed ? ` i ${remainingDisplayNames.length} més` : ' mostrar menys'}
                </a>
            }
        </>
    )
}

function NotificationLog({ castellersInfo, notificationsState }) {
    const [notifications, setNotifications] = useState([]);
    const [loadNNotifications, setLoadNNotifications] = useState(5);

    useEffect(() => {
        fetchAPI('/notifications', newData => {
            setNotifications(prevData => {
                if (prevData.length > 0) {
                    return newData.map(item => {
                        const isExistingItem = prevData.some(prevItem => prevItem.id === item.id);
                        return isExistingItem ? item : { ...item, new: true };
                    });
                } else {
                    return newData;
                }
            })
        });
    }, [
        notificationsState === 'done'
    ]);

    useEffect(() => {
        const id = setTimeout(() => {
            setNotifications(prevData => {
                return prevData.map(item => ({ ...item, new: false }));
            })
        }, 5000);

        return () => clearTimeout(id);
    }, [
        notifications.length
    ])

    const displayName = id => castellersInfo[id] ?
        (castellersInfo[id].mote || `${castellersInfo[id].nom} ${castellersInfo[id].cognom[0]}.`) :
        ''

    const groupedNotificationsByNotificationId = notifications
        .reduce((acc, notification) => {
            if (notification.notification_id in acc) {
                acc[notification.notification_id].push(notification);
            } else {
                acc[notification.notification_id] = [notification];
            }
            return acc;
        }, {});

    const dataEnviament = notification => {
        // Fa N segons
        const diffTime = Math.abs(moment() - moment(notification.createdAt));
        const diffSeconds = Math.floor(diffTime / 1000);
        if (diffSeconds < 60) return `Fa ${diffSeconds} segons`;
        // Fa N minuts
        const diffMinutes = Math.floor(diffSeconds / 60);
        if (diffMinutes < 60) return `Fa ${diffMinutes} minuts`;
        // Fa N hores i M minuts
        const diffHours = Math.floor(diffMinutes / 60);
        const diffMinutes2 = diffMinutes % 60;
        if (diffHours < 24) return `Fa ${diffHours} hores i ${diffMinutes2} minuts`;
        
        return moment(notification.createdAt).format('HH:mm DD/MM/YYYY')
    }

    return notifications.length > 0 && (
        <div>
            <h2>Historial de notificacions</h2>

            <div
                style={{
                    width: '100%',
                    overflowX: 'auto',
                }}
            >
                <table
                    id="notifications-log"
                >
                    <thead>
                        <tr>
                            {/* <th>Id</th> */}
                            {/* <th>Usuari</th> */}
                            <th>Enviador</th>
                            <th>Receptors</th>
                            <th>Títol (exemple)</th>
                            <th>Missatge (exemple)</th>
                            <th>Data d'enviament</th>
                        </tr>
                    </thead>
                    <tbody
                        style={{
                            fontSize: '0.8rem',
                        }}
                    >
                        {
                            Object.values(groupedNotificationsByNotificationId)
                                .sort((a, b) => applyTimeZone(a[0].createdAt) > applyTimeZone(b[0].createdAt) ? -1 : 1)
                                .slice(0, loadNNotifications)
                                .map(notifications => (
                                    <tr
                                        key={notifications[0].notification_id}
                                        className={`notification ${notifications[0].new ? 'new' : ''}`}
                                    >
                                        {/* <td>{notifications[0].notification_id}</td> */}
                                        {/* <td>{notifications[0].target}</td> */}
                                        <td>{displayName(notifications[0].author)}</td>
                                        <td>

                                            <NotificationRecepients
                                                notifications={notifications}
                                                displayName={displayName}
                                            />
                                        </td>
                                        <td>{notifications[0].title}</td>
                                        <td>{notifications[0].body}</td>
                                        <td>
                                            {dataEnviament(notifications[0])}
                                        </td>
                                    </tr>
                                ))
                        }
                    </tbody>
                </table>
            </div>

            {
                loadNNotifications < Object.values(groupedNotificationsByNotificationId).length &&
                <button
                    onClick={() => setLoadNNotifications(loadNNotifications + 5)}
                    style={{
                        width: '100%',
                        marginTop: 10,
                    }}
                >
                    Carrega'n més
                </button>
            }
        </div>
    )
}

export default NotificationLog;