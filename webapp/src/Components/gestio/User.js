const { useEffect, useState } = require("react");
const { fetchAPI, postAPI } = require("../../utils/utils");

function User({ 
    user,
    socket,
    userInfo,
    updateUser,
    show_popup,
    confirmar_reload_pass,
    COLLA,
    generate_default_password,
    ProfilePicEditor,
    spoilers,
    setSpoilers,
    all_etiquetes,
    setAllEtiquetes,
}) {
    const [etiquetes, setEtiquetes] = useState([]);

    useEffect(() => {
        fetchAPI('/etiquetes/' + user.id, setEtiquetes, false);
    }, [
        user
    ]);

    const add_etiqueta = ({ id }) => {
        setEtiquetes(prev => [...prev, { id }]);

        postAPI(
            '/add_etiqueta',
            { user: user.id, etiqueta: id },
            // () => fetchAPI('/etiquetes/' + user.id, setEtiquetes),
            () => {}
        );
    }

    const drop_etiqueta = ({ id }) => {
        setEtiquetes(prev => prev.filter(etiqueta => etiqueta.id !== id));

        postAPI(
            '/drop_etiqueta',
            { user: user.id, etiqueta: id },
            // () => fetchAPI('/etiquetes/' + user.id, setEtiquetes),
            () => {}
        );
    }

    const create_etiqueta = (force_nom=null) => {
        const nom = force_nom ? force_nom : prompt('Nom de l\'etiqueta:');
        if (nom) {
            postAPI(
                '/create_etiqueta',
                { nom },
                () => fetchAPI('/etiquetes', setAllEtiquetes),
            );
        }
    }

    const juntaRole = parseInt(userInfo['es_junta']);
    const tecnicaRole = parseInt(userInfo['es_tecnica']);

    return (
        <div key={user.id} className="user">
            <ProfilePicEditor user={user} colla={COLLA} socket={socket} />

            <div className="user-info">
                <table>
                <tbody>
                    <tr><td className="title">Nom:</td><td>{user.nom}</td></tr>
                    <tr><td className="title">1r cognom:</td><td>{user['primer-cognom']}</td></tr>
                    <tr><td className="title">2n cognom:</td><td>{user['segon-cognom']}</td></tr>
                    <tr><td className="title">Mote:</td><td>{user.mote}</td></tr>
                    <tr><td className="title">Altura:</td><td>{user.altura}</td></tr>
                    { user.altura_mans && <tr><td className="title">Altura mans:</td><td>{user.altura_mans}</td></tr> }
                    <tr><td className="title">És tècnica:</td><td>{user['es_tecnica'] === 2 ? 'Cap de tècnica' : user['es_tecnica'] === 1 ? 'Membre de tècnica' : 'No'}</td></tr>
                    <tr><td className="title">És junta:</td><td>{user['es_junta'] === 2 ? 'Cap de junta' : user['es_junta'] === 1 ? 'Membre de junta' : 'No'}</td></tr>
                    <tr><td className="title">Està amagat:</td><td>{user['hidden'] === 1 ? 'Sí' : 'No'}</td></tr>
                    <tr><td className="title">És canalla:</td><td>{user['canalla'] === 1 ? 'Sí' : 'No'}</td></tr>
                    <tr><td className="title">És music:</td><td>{user['music'] === 1 ? 'Sí' : 'No'}</td></tr>
                    <tr><td className="title">Està lesionat:</td><td>{user['lesionat'] === 1 ? 'Sí' : 'No'}</td></tr>
                    <tr><td className="title">Rep notificacions:</td><td>{user['expo_push_token'] !== null ? 'Sí' : 'No'}</td></tr>
                    {
                        (juntaRole >= parseInt(user['es_junta']) && tecnicaRole >= parseInt(user['es_tecnica'])) &&
                        <tr>
                            <td className="title">Contrasenya predeterminada:</td>
                            <td style={{ cursor: 'pointer', backgroundColor: spoilers?.[user.id] ? 'transparent' : 'black' }} onClick={() => setSpoilers(prev => ({ ...prev, [user.id]: !prev?.[user.id] }))}>{generate_default_password(user)}</td>
                        </tr>
                    }
                </tbody>
                </table>
            </div>

            <div
                style={{
                    width: '90%',
                }}
            >
                <h3>Etiquetes</h3>
                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        flexDirection: 'row',
                        justifyContent: 'flex-start',
                        flex: 1,
                        margin: 10,
                    }}
                >
                    { all_etiquetes.map(etiqueta => (
                        <div 
                            key={etiqueta.id} 
                            style={{ 
                                backgroundColor:
                                    etiquetes.map(etiqueta => etiqueta.id).includes(etiqueta.id) ? '#ccccff' :
                                    '#ffffff',
                                border: '1px solid #000000',
                                borderRadius: 5,
                                padding: 5,
                                margin: 5,
                                fontSize: 12,
                                cursor: 'pointer'
                            }}
                            onClick={() => etiquetes.map(etiqueta => etiqueta.id).includes(etiqueta.id) ? drop_etiqueta({ id: etiqueta.id }) : add_etiqueta({ id: etiqueta.id })}
                        >
                            <span style={{ padding: 5 }}>{etiquetes.map(etiqueta => etiqueta.id).includes(etiqueta.id) ? '-' : '+'}</span>
                            <span>{etiqueta.nom}</span>
                        </div>
                    )) }
                </div>
                {/* <div className="create-etiqueta">
                    <button onClick={() => create_etiqueta()}>Crear nova etiqueta</button>
                </div> */}
            </div>

            {
                (parseInt(userInfo['es_junta']) >= 2 || parseInt(userInfo['es_tecnica']) >= 2 || (parseInt(userInfo['es_junta']) >= parseInt(user['es_junta']) && parseInt(userInfo['es_tecnica']) >= parseInt(user['es_tecnica']))) && 
                <>
                    <hr width={50} style={{ margin: 20 }} />
                    <div className="edit-button">
                        <button onClick={() => show_popup(user)}>&#9998; Editar</button>
                        <button onClick={() => confirmar_reload_pass(user)}>&#128260; Reiniciar</button>
                        {/* <button onClick={() => confirmar_eliminar_user(user)}>&#128465; Eliminar</button> */}
                        <button onClick={() => updateUser(user, { hidden: user.hidden ? 0 : 1 })}>👁️ { user.hidden ? 'Desamagar' : 'Amagar' }</button>
                    </div>
                </>
            }
        </div>
    );
}

export default User;