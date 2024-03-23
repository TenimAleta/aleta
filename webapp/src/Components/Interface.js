import PissarraApp from './PissarraApp'
import ProvesApp from './interface/ProvesApp';
import GestioApp from './gestio/GestioApp';
import CalendarApp from './calendar/CalendarApp';

import { useEffect, useState } from 'react';
import NotificationsDashboard from './notifications/NotificationsDashboard';
import FeedbackApp from './feedback/FeedbackApp';
import EditorApp from './editor/EditorApp';

import { fetchAPI, getSubdomain } from '../utils/utils';
import { loginUser, isLoggedIn, logoutUser } from '../utils/login';
import LoginApp from './login/LoginApp';
import FormsApp from './forms/FormsApp';
import FillForm from './forms/fill/FillForm';
import StatsApp from './stats/StatsApp';
import EtiquetesApp from './etiquetes/EtiquetesApp';
import FitxarApp from './fitxar/FitxarApp';
const COLLA = getSubdomain();

const PRODUCTION = process.env.REACT_APP_PRODUCTION || true;

// Define socket with server-side
const io = require("socket.io-client");
const serverEndpoint = PRODUCTION !== true ? 'http://localhost:4001' : `https://${COLLA}-api.tenimaleta.com:4001`
const socket = io(serverEndpoint);

export function NoSignal({ socket }) {
    const [noSignal, setNoSignal] = useState(false);

    useEffect(() => {
        socket.on('connect_error', (err) => setNoSignal(true));
        socket.on('disconnect', (err) => setNoSignal(true));
        socket.on('connect', () => setNoSignal(false));

        return () => {
            socket.off('connect_error')
            socket.off('disconnect')
            socket.off('connect')
        }
    }, [socket])

    return noSignal && (
        <div style={{ position: 'fixed', zIndex: 99999, left: 20, top: 20 }}>
            <div style={{ padding: 20, backgroundColor: 'rgba(220,220,220,0.95)', borderRadius: 10 }}>
                <div style={{ fontSize: 20 }}>🚫 📶</div>
            </div>
        </div>
    )
}  

function Interface(props) {
    const [isLogged, setIsLogged] = useState(null);
    const [userId, setUserId] = useState(null);
    const [userInfo, setUserInfo] = useState({})
    const [serverId, setServerId] = useState('');
    const [castellersInfo, setCastellersInfo] = useState({});

    const params = window.location.pathname.split('/').filter(part => part != '');
    const isInPissarra = params.length >= 3;
    const isInPissarraReadOnly = isInPissarra && params[3] !== 'edit';
    const isInProjector = params.length > 0 && ['esdeveniments', 'assaigs', 'activitats', 'actuacions'].includes(params[0]);
    const isInGestio = params.length > 0 && params[0] === 'gestio';
    const isInCalendar = params.length > 0 && params[0] === 'calendar';
    const isInNotifications = params.length > 0 && params[0] === 'notifications';
    const isInFeedback = params.length > 0 && params[0] === 'feedback';
    const isInEditor = params.length > 0 && params[0] === 'editor';
    const isInForms = params.length > 0 && params[0] === 'forms';
    const isFillingForm = params.length > 0 && params[0] === 'f';
    const isInStats = params.length > 0 && params[0] === 'stats';
    const isInEventToEdit = params.length > 0 && params[0] === 'event';
    const isModels = params.length > 0 && params[0] === 'models';
    const isInEtiquetes = params.length > 0 && params[0] === 'etiquetes';
    const isInFitxar = params.length > 0 && params[0] === 'fitxar';

    const exports = {
        'socket': socket,
        'isLogged': isLogged,
        'setIsLogged': setIsLogged,
        'userId': userId,
        'setUserId': setUserId,
        'userInfo': userInfo,
        'setUserInfo': setUserInfo,
        'isInEventToEdit': isInEventToEdit,
        'isModels':  isModels,
        'serverId': serverId,
        'setServerId': setServerId,
        'castellersInfo': castellersInfo,
        'setCastellersInfo': setCastellersInfo,
        ...props
    };

    useEffect(() => {
        fetchAPI('/castellersInfo', setCastellersInfo)
    }, [])
    
    useEffect(() => {
        isLoggedIn()
            .then(res => {
                setIsLogged(res.isLogged);
                setUserId(res.userId);
            });
    }, [])

    useEffect(() => {
        if (!isLogged) return;

        // Associate user with socket
        socket?.emit('.associate_user', userId)

        return () => {}
    }, [isLogged, userId, socket, serverId])

    return (<>
        {
            isFillingForm ? <FillForm {...exports} /> :
            isInProjector ? <PissarraApp {...exports} readonly={true} /> :
            isInEditor ? <EditorApp {...exports} /> :
            isInPissarraReadOnly ? <PissarraApp {...exports} readonly={true} /> :
            isLogged === null ? <></> :
            isLogged === false ? <LoginApp {...exports} /> :
            isInFeedback ? <FeedbackApp {...exports} /> :
            isInPissarra ? <PissarraApp {...exports} readonly={false} /> :
            isInNotifications ? <NotificationsDashboard {...exports} /> :
            isInGestio ? <GestioApp {...exports} /> :
            isInCalendar ? <CalendarApp {...exports} /> :
            isInForms ? <FormsApp {...exports} /> :
            isInStats ? <StatsApp {...exports} /> :
            isInEtiquetes ? <EtiquetesApp {...exports} /> :
            isInFitxar ? <FitxarApp {...exports} /> :
            <ProvesApp {...exports} />
        }
    </>)
}

export default Interface;
