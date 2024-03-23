import { useEffect, useState } from "react";
import Pressable from "../../other/Pressable";
import { fetchAPI } from "../../../utils/utils";

function BotoNovaPersona(props) {
    const { selectedBundle, showIf, castellersInfo, setCastellersInfo, socket, caixaSelected, setCastellerSelected, selectedEvent } = props;
    const [idToUpdate, setIdToUpdate] = useState(null);

    useEffect(() => {
        socket.on('.new_person_id', ({ prova_id, new_person_id }) => {
            fetchAPI('/castellersInfo', data => {
                setCastellersInfo(data);
                
                if (caixaSelected !== -1 && parseInt(prova_id) === parseInt(selectedBundle)) {
                    setIdToUpdate(new_person_id)
                }
            }, false);
        });

        return () => {
            socket.off('.new_person_id');
        }
    }, [caixaSelected, selectedEvent]);

    useEffect(() => {
        if (idToUpdate && castellersInfo[idToUpdate]) {
          setCastellerSelected(idToUpdate);
          setIdToUpdate(null);
        }
      }, [castellersInfo?.[idToUpdate], idToUpdate]);

    const novapersona = ev => {
        const nom = '-'
        const cognom = '-'
        const altura = null
        const mote = prompt('Dona el sobrenom de la persona nova.', '-');

        if (mote) {
            socket.emit('.new_person', nom, cognom, mote, altura, selectedBundle);
        }
    };

    return showIf && (
        <Pressable className="boto boto-nova-persona" onClick={novapersona}>
            👤+
        </Pressable>
    );
}

export default BotoNovaPersona;