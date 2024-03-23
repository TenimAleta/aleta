import { useEffect, useState } from "react";
import UserInfo from "../login/UserInfo";
import EtiquetesEditor from "./EtiquetesEditor";
import UsersEtiquetes from "./UsersEtiquetes";
import { fetchAPI } from "../../utils/utils";
import Pressable from "../other/Pressable";
import { HeaderTabs } from "../interface/ProvesApp";

function EtiquetesApp({ castellersInfo, setCastellersInfo, ...props }) {
    const [allEtiquetes, setAllEtiquetes] = useState([]);

    useEffect(() => {
        document.title = `Etiquetes - Aleta`;
    }, []);

    useEffect(() => {
        fetchAPI('/etiquetes', setAllEtiquetes);
    }, []);

    return (
        <div
            style={{ width: '80%', paddingTop: 50, paddingBottom: 50 }}
        >
            <UserInfo castellersInfo={castellersInfo} {...props} />

            <HeaderTabs {...props} />

            <Pressable style={{ backgroundColor: '#eee' }} className="boto-back" href='/'>
                ← Tornar a la pàgina principal
            </Pressable>

            <UsersEtiquetes allEtiquetes={allEtiquetes} setAllEtiquetes={setAllEtiquetes} castellersInfo={castellersInfo} />

            <div style={{ height: '50px' }}></div>
        </div>
    )
}

export default EtiquetesApp;