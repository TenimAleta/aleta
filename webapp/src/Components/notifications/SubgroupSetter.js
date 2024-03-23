import { useEffect, useState } from "react";
import { fetchAPI } from "../../utils/utils";

function SubgroupSetter({ socket, selectUsers, event, subgroupName, setSubgroupName, forms } ) {
    const [assistencies, setAssistencies] = useState([]);
    const [nonRespondants, setNonRespondants] = useState([]);

    useEffect(() => {
        if (event) fetchAPI(`/assistencies_event/${event}`, data => setAssistencies(data.data))

        socket.emit('.request_form_responses', event)

        socket.on('.form_responses', (res) => {
            if (res.evId === event) {
                // setResponses(Object.values(res.responses))
                setNonRespondants(Object.keys(res.responses))
            }
        })

        return () => {
            socket.off('.assistencies_event');
            socket.off('.form_responses');
        }
    }, [event]);

    // Select subgroup from URL
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const subgroup = urlParams.get('subgroup');

        const subgroupMap = {
            'no-confirmat': 'No confirmat',
            'venen': 'Vinc',
            'no-venen': 'No vinc',
            'formulari-no-respost': 'Formulari no respost',
        }

        if (subgroup) {
            if (subgroup === 'formulari-no-respost') {
                selectUsers(
                    assistencies
                        .filter(row => row.assistencia !== 'No vinc')
                        .filter(row => !nonRespondants.map(id => parseInt(id)).includes(row.id))
                        .map(row => ({
                            value: row.id,
                            label: row.mote || row.nom + ' ' + row.cognom,
                            color: row.has_notifications ? 'black' : 'red'
                        }))
                )

                setSubgroupName('Formulari no respost')
            } else if (subgroup in subgroupMap) {
                setSubgroupName(subgroupMap[subgroup])

                selectUsers(
                    assistencies
                        .filter(row => row.assistencia === subgroupMap[subgroup])
                        .map(row => ({
                            value: row.id,
                            label: row.mote || row.nom + ' ' + row.cognom,
                            color: row.has_notifications ? 'black' : 'red'
                        }))
                )
            }
        }
    }, [subgroupName])

    const thereIsAForm = event in forms;

    const subgroup = assistencies
        .filter(row => row.assistencia === subgroupName);

    useEffect(() => {
        if (!event) return selectUsers([]);

        if (thereIsAForm && subgroupName === 'Formulari no respost') {
            selectUsers(
                assistencies
                    .filter(row => row.assistencia !== 'No vinc')
                    .filter(row => !nonRespondants.map(id => parseInt(id)).includes(row.id))
                    .map(row => ({
                        value: row.id,
                        label: row.mote || row.nom + ' ' + row.cognom,
                        color: row.has_notifications ? 'black' : 'red'
                    }))
            )
        } else {
            selectUsers(
                subgroup.map(info => ({
                    value: info.id,
                    label: info.mote || info.nom + ' ' + info.cognom,
                    color: info.has_notifications ? 'black' : 'red'
                }))
            )
        }
    }, [assistencies, event, subgroupName, forms, nonRespondants])
}

export default SubgroupSetter;