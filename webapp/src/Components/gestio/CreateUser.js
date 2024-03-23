import { useState } from "react";
import Popup from "../other/Popup";

function CreateUser(props) {
    const { closed, setClosed, socket } = props;

    const [nom, setNom] = useState('');
    const [cognom, setCognom] = useState('');
    const [segonCognom, setSegonCognom] = useState('');
    const [mote, setMote] = useState('');
    const [altura, setAltura] = useState('');
    const [altura_mans, setAlturaMans] = useState('');
    const [tecnica, setTecnica] = useState(0);
    const [junta, setJunta] = useState(0);
    const [canalla, setCanalla] = useState(false);
    const [music, setMusic] = useState(false);
    const [lesionat, setLesionat] = useState(false);

    const createUser = () => {
        const responses = {
            'nom': nom,
            'primer-cognom': cognom,
            'segon-cognom': segonCognom,
            'mote': mote,
            'altura': parseInt(altura),
            'altura_mans': parseInt(altura_mans),
            'tecnica': parseInt(tecnica),
            'junta': parseInt(junta),
            'canalla': canalla ? 1 : 0,
            'music': music ? 1 : 0,
            'lesionat': lesionat ? 1 : 0,
        };

        if (nom === '' || cognom === '') {
            alert('El nom i el cognom són camps obligatoris.')
        } else {
            socket.emit('.create_user', responses);
            socket.emit('.request_users');
            setClosed(true);
        }
    };

    if (!closed) {
        return (
            <Popup closed={closed} setClosed={setClosed}>
                <h2>Crear casteller</h2>
                <div className="user-info">
                    <table>
                    <tbody>
                        <tr><td className="title">Nom:</td><td><input type="text" defaultValue={nom} onChange={e => setNom(e.target.value)} /></td></tr>
                        <tr><td className="title">1r cognom:</td><td><input type="text" defaultValue={cognom} onChange={e => setCognom(e.target.value)} /></td></tr>
                        <tr><td className="title">2n cognom:</td><td><input type="text" defaultValue={segonCognom} onChange={e => setSegonCognom(e.target.value)} /></td></tr>
                        <tr><td className="title">Mote:</td><td><input type="text" defaultValue={mote} onChange={e => setMote(e.target.value)} /></td></tr>
                        <tr><td className="title">Altura:</td><td><input type="number" defaultValue={altura} onChange={e => setAltura(e.target.value)} /></td></tr>
                        <tr><td className="title">Altura mans:</td><td><input type="number" defaultValue={altura_mans} onChange={e => setAlturaMans(e.target.value)} /></td></tr>
                        <tr>
                            <td className="title">És tècnica:</td>
                            <div>
                                { props.userInfo?.es_tecnica === 2 && <label><input style={{ fontSize: 16 }} onChange={() => setTecnica(2)} name="tecnica" type="radio" defaultChecked={parseInt(tecnica) === 2} /> Cap de tècnica</label> }
                                <label><input style={{ fontSize: 16 }} onChange={() => setTecnica(1)} name="tecnica" type="radio" defaultChecked={parseInt(tecnica) === 1} /> Tècnica</label>
                                <label><input style={{ fontSize: 16 }} onChange={() => setTecnica(0)} name="tecnica" type="radio" defaultChecked={parseInt(tecnica) === 0} /> No tècnica</label>
                            </div>
                        </tr>
                        <tr>
                            <td className="title">És junta:</td>
                            <div>
                                { (props.userInfo?.es_tecnica === 2 || props.userInfo?.es_junta === 2) && <label><input style={{ fontSize: 16 }} onChange={() => setJunta(2)} name="junta" type="radio" defaultChecked={parseInt(junta) === 2} /> Cap de junta</label> }
                                <label><input style={{ fontSize: 16 }} onChange={() => setJunta(1)} name="junta" type="radio" defaultChecked={parseInt(junta) === 1} /> Junta</label>
                                <label><input style={{ fontSize: 16 }} onChange={() => setJunta(0)} name="junta" type="radio" defaultChecked={parseInt(junta) === 0} /> No junta</label>
                            </div>
                        </tr>
                        <tr><td className="title">És canalla:</td><td>És canalla? <input type="checkbox" checked={canalla} onChange={e => setCanalla(e.target.checked)} /></td></tr>
                        <tr>
                            <td className="title">És músic:</td>
                            <td>És músic? <input type="checkbox" checked={music} onChange={e => setMusic(e.target.checked)} /></td>
                        </tr>
                        <tr>
                            <td className="title">Està lesionat:</td>
                            <td>Està lesionat? <input type="checkbox" checked={lesionat} onChange={e => setLesionat(e.target.checked)} /></td>
                        </tr>
                    </tbody>
                    </table>
                </div>
                <div className="save-buttons">
                    <button onClick={() => createUser()}>Crear</button>
                    <a onClick={() => setClosed(true)} href='#'>Cancel·lar</a>
                </div>
            </Popup>
        );
    }
}

export default CreateUser;