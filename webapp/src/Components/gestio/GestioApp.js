import { useCallback, useEffect, useState } from "react";
import EditUser from './EditUser'
import CreateUser from './CreateUser'
import './GestioApp.css'
import { NoSignal } from "../Interface";
import { downloadImage, uploadImage } from "../../utils/upload-image";
import { fetchAPI, getSubdomain } from '../../utils/utils';
import UserInfo from "../login/UserInfo";
import md5 from "md5";
import User from "./User";
import Pressable from "../other/Pressable";
import { HeaderTabs } from "../interface/ProvesApp";

const placeholderProfileImg = 'https://static.vecteezy.com/system/resources/thumbnails/006/390/348/small/simple-flat-isolated-people-icon-free-vector.jpg'; // 'https://via.placeholder.com/200x200.png?text=Foto+no+posada'
const COLLA = getSubdomain();

function ProfilePicEditor({ user, colla, socket }) {
    const [profilePic, setProfilePic] = useState(null);
    const [showUpload, setShowUpload] = useState(false);

    const downloadProfilePic = useCallback(async () => {
        try {
            const base64 = await downloadImage(user.id, COLLA);
            setProfilePic(base64);
        } catch (e) {
            setProfilePic(false);
        }
    }, [user]);

    useEffect(() => {
        downloadProfilePic();
    }, [downloadProfilePic]);

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64 = reader.result;
            
            // Upload image to S3 bucket
            uploadImage(base64, user.id, COLLA)
                // Communicate server to update profile pic
                .then(() => socket.emit('.changed_profile_pic', user.id))
                .catch(e => console.log(e));

            setProfilePic(base64);
        };
        reader.onerror = (error) => {
            console.log('Error: ', error);
        };
    };

    return (
        <div className="profile-pic-editor" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <div className="profile-pic">
                {
                    profilePic === null ? <></> :
                    profilePic === undefined ? <img style={{ borderRadius: 10, width: 200, height: 200, }} src={placeholderProfileImg} alt="No té foto de perfil" /> :
                    <img style={{ borderRadius: 10, width: 200, height: 200, objectFit: 'cover', objectPosition: 'center' }} src={profilePic} alt="No té foto de perfil" />
                }
            </div>
            <div className="profile-pic-actions" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 10,
            }}>
                {/* <button onClick={downloadProfilePic}>
                    { !profilePic ? <>Mostrar</> : <>Recarregar</> } foto de perfil
                </button> */}
                <button onClick={() => setShowUpload(prev => !prev)}>Canviar la foto de perfil</button>
            </div>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 10,
                }}
            >
                { showUpload && <input type="file" onChange={handleUpload} accept="image/*" style={{ fontSize: 12 }} /> }
            </div>
        </div>
    );
}

function GestioApp(props) {
    const { socket, userId } = props;
    const [users, setUsers] = useState([]);
    const [loadMore, setLoadMore] = useState(6);

    const [selectedUser, setSelectedUser] = useState({});
    const [editClosed, setEditClosed] = useState(true);
    const [crearClosed, setCrearClosed] = useState(true);

    const [filter, setFilter] = useState('');
    const [filterInfo, setFilterInfo] = useState(false);
    const [filterTecnica, setFilterTecnica] = useState(false);
    const [filterJunta, setFilterJunta] = useState(false);
    const [filterHidden, setFilterHidden] = useState(false);

    const [spoilers, setSpoilers] = useState({});

    const [excelFile, setExcelFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const [all_etiquetes, setAllEtiquetes] = useState([]);

    const handleFileChange = (e) => {
        setExcelFile(e.target.files[0]);
    };

    const handleSubmit = () => {
        if (excelFile) {
            setIsUploading(true);
            const reader = new FileReader();
            reader.readAsDataURL(excelFile);
            reader.onload = () => {
                socket.emit('.upload_excel', reader.result);
            };
            reader.onerror = (error) => {
                console.error('Error reading the file:', error);
                setIsUploading(false);
            };
        }
    };

    // Listen for server response
    useEffect(() => {
        socket.on('.excel_uploaded', () => {
            alert("S'ha penjat correctament l'Excel!");
            setIsUploading(false);
            setExcelFile(null); // Clear the file input
            window.location.reload(); // Reload the page
        });
    }, []);

    useEffect(() => {
        fetchAPI('/etiquetes', setAllEtiquetes);
    }, []);

    const normalize = (str) => {
        return String(str)
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")    
            .toLowerCase();
    };

    const isUserWithMissingInfo = (user) =>
        [...Object.values((
            ({ nom, 'primer-cognom': primer, mote, altura, es_tecnica }) =>
            ({ nom, 'primer-cognom': primer, mote, altura, es_tecnica })
        )
        (user))]
            .filter(val => val === null || val === '-')
            .length > 0;

    const confirmar_reload_pass = user => {
        const msg = `Borrarem la contrasenya de l'usuari ${user.nom} ${user['primer-cognom']} (${user.mote}). Un cop torni a obrir l'aplicació, podrà definir la seva nova contrasenya a la pantalla de benvinguda. Vols continuar?`;
        if (window.confirm(msg)) socket.emit('.reload_password', user);
    };

    const show_popup = user => {
        setEditClosed(false);
        setSelectedUser(user);
    };

    const updateUser = (user, changes={}) => {
        const responses = {
            'id': user.id,
            'nom': user.nom,
            'primer-cognom': user['primer-cognom'],
            'segon-cognom': user['segon-cognom'],
            'mote': user.mote,
            'altura': parseInt(user.altura),
            'altura_mans': parseInt(user.altura_mans),
            'tecnica': parseInt(user['es_tecnica']),
            'junta': parseInt(user['es_junta']),
            'hidden': user.hidden ? 1 : 0,
            'canalla': user.canalla ? 1 : 0,
            'music': user.music ? 1 : 0,
            'lesionat': user.lesionat ? 1 : 0,
        };

        const new_responses = {
            ...responses,
            ...changes
        }

        socket.emit('.edit_user', new_responses);
        socket.emit('.request_users');
    };

    useEffect(() => {
        document.title = `Editar castellers - Aleta`;

        socket.emit('.request_users');
        socket.on('.users', info => setUsers(info));
    }, []);

    const downloadDatabaseAsExcel = () => {
        fetch(`https://${COLLA}-api.tenimaleta.com:4001/api/export_castellers_as_excel`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })
            .then(res => res.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const date = new Date();
                const formattedDate = `${date.getDate()}-${date.getMonth()+1}-${date.getFullYear()}`;
                a.download = `${COLLA}-${formattedDate}.xlsx`;
                a.click();
            })
            .catch(e => console.log(e));      
    };

    const generate_default_password = user => md5(`default.${user.nom}.${user['primer-cognom']}`).slice(0,8)

    const sortCastellers = (a, b) => {
        if (!a.mote && !b.mote) return 0;
        if (!a.mote) return 1;
        if (!b.mote) return -1;
        return a.mote.localeCompare(b.mote);
    };

    const filteredUsers = users
        .filter(user => filter !== '' ? 1 : filterInfo ? isUserWithMissingInfo(user) : true)
        .filter(user => filter !== '' ? 1 : filterTecnica ? user.es_tecnica !== 0 : true)
        .filter(user => filter !== '' ? 1 : filterJunta ? user.es_junta !== 0 : true)
        .filter(user => filter !== '' ? 1 : filterHidden ? user.hidden === 1 : user.hidden !== 1)
        .filter(user => `${normalize(user.nom)} ${normalize(user['primer-cognom'])} ${normalize(user['segon-cognom'])} ${normalize(user.mote)}`.includes(normalize(filter)))
        .sort(sortCastellers)

    const llista_users = filteredUsers
        .slice(0, filter !== '' && filter.length > 2 ? users.length : loadMore)
        .map(user => {
            return <User
                key={user.id}
                user={user}
                socket={socket}
                userInfo={props.userInfo}
                updateUser={updateUser}
                show_popup={show_popup}
                confirmar_reload_pass={confirmar_reload_pass}
                COLLA={COLLA}
                generate_default_password={generate_default_password}
                ProfilePicEditor={ProfilePicEditor}
                spoilers={spoilers}
                setSpoilers={setSpoilers}
                all_etiquetes={all_etiquetes}
                setAllEtiquetes={setAllEtiquetes}
            />
        });

    return (
        <>
            <NoSignal socket={socket} />

            <div style={{ padding: 20 }}>
                <UserInfo {...props} socket={socket} />

                <HeaderTabs {...props} />

                <Pressable style={{ backgroundColor: '#eee' }} className="boto-back" href='/'>
                    ← Tornar a la pàgina principal
                </Pressable>
                <div>
                    <h2>Filtres</h2>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 10 }}>
                            <input style={{ fontSize: 16, width: '60%' }} placeholder="Busca un usuari..." type="text" value={filter} onChange={ev => setFilter(ev.target.value)} />
                            <input type='reset' value='Esborra' onClick={() => setFilter('')} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                            <div>
                                <label htmlFor="falta-info">Falta informació</label>
                                <input id="falta-info" type="checkbox" onChange={() => setFilterInfo(prev => !prev)} />
                            </div>
                            <div>
                                <label htmlFor="filtre-tecnica">Tècnica</label>
                                <input id="filtre-tecnica" type="checkbox" onChange={() => setFilterTecnica(prev => !prev)} />
                            </div>
                            <div>
                                <label htmlFor="filtre-tecnica">Junta</label>
                                <input id="filtre-tecnica" type="checkbox" onChange={() => setFilterJunta(prev => !prev)} />
                            </div>
                            <div>
                                <label htmlFor="filtre-hidden">Amagats</label>
                                <input id="filtre-hidden" type="checkbox" onChange={() => setFilterHidden(prev => !prev)} />
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h2>Baixa la base de dades com a Excel</h2>
                    <p>Pots descarregar la base de dades completa en format Excel.</p>
                    <button onClick={downloadDatabaseAsExcel}>Descarregar</button>
                </div>

                <div>
                    <h2>Puja un Excel</h2>
                    <p>Descarrega't i omple la següent plantilla: <a href={`https://${COLLA}-api.tenimaleta.com:4001/api/download-template`}>descarrega la plantilla</a></p>
                    <p>Aleshores, penja-la omplerta aquí.</p>
                    <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
                    <button onClick={handleSubmit} disabled={isUploading || !excelFile}>
                        {isUploading ? "Penjant..." : "Enviar"}
                    </button>
                </div>
                <div>
                    <h2>Usuaris</h2>
                    { !crearClosed && <CreateUser closed={crearClosed} setClosed={setCrearClosed} socket={socket} {...props} /> }
                    <EditUser user={selectedUser} closed={editClosed} setClosed={setEditClosed} socket={socket} {...props} />
                    
                    <Pressable style={{ backgroundColor: '#eee' }} className="crear_usuari_button" onClick={() => setCrearClosed(false)}>+ Crear usuari</Pressable>
                    
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'space-around',
                        }}
                    >
                        {llista_users}
                    </div>

                    { loadMore < filteredUsers.length && <button
                        style={{
                            width: '100%',
                            padding: 20,
                            fontSize: 16,
                        }}
                        onClick={() => setLoadMore(prev => prev + 6)}>Carrega'n més</button> }
                </div>

                <div style={{ height: '50px' }}></div>
            </div>
        </>
    );
}

export default GestioApp;