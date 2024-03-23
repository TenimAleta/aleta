import { useState, useEffect } from "react";
import Popup from "../other/Popup";

function EditUser(props) {
    const { user, closed, setClosed, socket, userInfo } = props;

    const [nom, setNom] = useState('');
    const [cognom, setCognom] = useState('');
    const [segonCognom, setSegonCognom] = useState('');
    const [mote, setMote] = useState('');
    const [altura, setAltura] = useState('');
    const [alturaMans, setAlturaMans] = useState('');
    const [tecnicaRole, setTecnicaRole] = useState(0);
    const [juntaRole, setJuntaRole] = useState(0);
    const [hidden, setHidden] = useState(false);
    const [canalla, setCanalla] = useState(false);
    const [music, setMusic] = useState(false);
    const [lesionat, setLesionat] = useState(false);

    useEffect(() => {
        if (!closed && user) {
            setNom(user.nom);
            setCognom(user['primer-cognom']);
            setSegonCognom(user['segon-cognom']);
            setMote(user.mote);
            setAltura(user.altura);
            setAlturaMans(user.altura_mans);
            setTecnicaRole(user['es_tecnica']);
            setJuntaRole(user['es_junta']);
            setHidden(user['hidden'] === 1);
            setCanalla(user['canalla'] === 1);
            setMusic(user['music'] === 1);
            setLesionat(user['lesionat'] === 1);
        } else {
            setNom('');
            setCognom('');
            setSegonCognom('');
            setMote('');
            setAltura('');
            setAlturaMans('');
            setTecnicaRole(0);
            setJuntaRole(0);
            setHidden(false);
            setCanalla(false);
            setMusic(false);
            setLesionat(false);
        }
        
    }, [user, closed]);

    const updateUser = () => {
        const responses = {
            'id': user.id,
            'nom': nom,
            'primer-cognom': cognom,
            'segon-cognom': segonCognom,
            'mote': mote,
            'altura': parseInt(altura),
            'altura_mans': parseInt(alturaMans),
            'tecnica': parseInt(tecnicaRole),
            'junta': parseInt(juntaRole),
            'hidden': hidden ? 1 : 0,
            'canalla': canalla ? 1 : 0,
            'music': music ? 1 : 0,
            'lesionat': lesionat ? 1 : 0,
        };

        socket.emit('.edit_user', responses);
        socket.emit('.request_users');
        setClosed(true);
    };

    const confirmar_eliminar_user = user => {
        const msg = `Segur que vols eliminar l'usuari #${user.id} ${user.nom} ${user['primer-cognom']} ${user['segon-cognom'] && user['segon-cognom']}?`;
        const warn = user['md5pass'] !== null ? `\n\nAQUEST USUARI TÉ CONTRASENYA - SEGUR QUE NO ÉS ACTIU? CUIDADO!` : `\n\nAquest usuari NO té contrasenya... No ha usat mai l'app. Endavant, elimina'l ja.`;

        if (window.confirm(msg + warn)) {
            socket.emit('.delete_user', user);
            socket.emit('.request_users');
            setClosed(true);
        }
    };

    if (!closed) {
        return (
            <Popup closed={closed} setClosed={setClosed}>
                <h2>Editar casteller</h2>
                <div className="user-info">
                    <div className="title">Nom</div>
                    <div><input type="text" value={nom} onChange={e => setNom(e.target.value)} /></div>
                    <div className="title">1r cognom</div>
                    <div><input type="text" value={cognom} onChange={e => setCognom(e.target.value)} /></div>
                    <div className="title">2n cognom</div>
                    <div><input type="text" value={segonCognom} onChange={e => setSegonCognom(e.target.value)} /></div>
                    <div className="title">Mote</div>
                    <div><input type="text" value={mote} onChange={e => setMote(e.target.value)} /></div>
                    <div className="title">Altura</div>
                    <div><input type="number" value={altura} onChange={e => setAltura(e.target.value)} /></div>
                    <div className="title">Altura mans</div>
                    <div><input type="number" value={alturaMans} onChange={e => setAlturaMans(e.target.value)} /></div>
                    <div className="title">És tècnica</div>
                    <div>
                        { props.userInfo?.es_tecnica === 2 && <label><input onChange={() => setTecnicaRole(2)} name="tecnica" type="radio" checked={parseInt(tecnicaRole) === 2} /> Cap de tècnica</label> }
                        <label><input onChange={() => setTecnicaRole(1)} name="tecnica" type="radio" checked={parseInt(tecnicaRole) === 1} /> Tècnica</label>
                        <label><input onChange={() => setTecnicaRole(0)} name="tecnica" type="radio" checked={parseInt(tecnicaRole) === 0} /> No tècnica</label>
                    </div>
                    <div className="title">És junta</div>
                    <div>
                        { (props.userInfo?.es_tecnica === 2 || props.userInfo?.es_junta === 2) && <label><input onChange={() => setJuntaRole(2)} name="junta" type="radio" checked={parseInt(juntaRole) === 2} /> Cap de junta</label> }
                        <label><input onChange={() => setJuntaRole(1)} name="junta" type="radio" checked={parseInt(juntaRole) === 1} /> Junta</label>
                        <label><input onChange={() => setJuntaRole(0)} name="junta" type="radio" checked={parseInt(juntaRole) === 0} /> No junta</label>
                    </div>
                    <div className="title">Amagar casteller</div>
                    <div><label>Amagar casteller? <input type="checkbox" checked={hidden} onChange={e => setHidden(e.target.checked)} /></label></div>
                    <div className="title">És canalla</div>
                    <div><label>És canalla? <input type="checkbox" checked={canalla} onChange={e => setCanalla(e.target.checked)} /></label></div>
                    <div className="title">Músic</div>
                    <div><label>Músic? <input type="checkbox" checked={music} onChange={e => setMusic(e.target.checked)} /></label></div>
                    <div className="title">Lesionat</div>
                    <div><label>Lesionat? <input type="checkbox" checked={lesionat} onChange={e => setLesionat(e.target.checked)} /></label></div>
                </div>
                <div className="save-buttons">
                    <button onClick={() => updateUser()}>Guardar</button>
                    <a onClick={() => setClosed(true)} href='#'>Cancel·lar</a>
                </div>

                { userInfo.es_tecnica >= 2 && <div className="edit-button">
                    <button style={{ backgroundColor: 'rgba(255,0,0,0.4)' }} onClick={() => confirmar_eliminar_user(user)}>&#128465; Eliminar</button>
                </div> }
            </Popup>
        );
    }
}

export default EditUser;