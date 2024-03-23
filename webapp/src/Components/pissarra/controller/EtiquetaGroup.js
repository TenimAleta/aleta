import { useEffect, useState } from "react";
import { fetchAPI } from "../../../utils/utils";

function EtiquetaGroup({ etiqueta }) {
    const [usersEtiqueta, setUsersEtiqueta] = useState([]);

    useEffect(() => {
        fetchAPI('/etiqueta_users/' + etiqueta, data => {
            setUsersEtiqueta(data);
        });
    }, [
        etiqueta
    ]);

    return (<>
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                margin: 10,
                padding: 10,
                borderRadius: 5,
                backgroundColor: '#eee',
                gap: 5,
            }}
        >
            {
                usersEtiqueta.map(user => (
                    <div
                        key={user.id}
                        className="user"
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            margin: 10,
                            padding: 10,
                            borderRadius: 5,
                            backgroundColor: '#eee',
                            gap: 5,
                        }}
                    >
                        <span>{user.nom}</span>
                    </div>
                ))
            }
        </div>
    </>)
}

export default EtiquetaGroup;