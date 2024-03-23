import { useEffect } from "react";
import { fetchAPI } from "../../utils/utils";
import { useState } from "react";
import { Bar } from "react-chartjs-2";
import moment from "moment";

const string2color = (str, transparency = 1, seed = 1) => {
    let hash = seed; // Use seed to modify the initial hash value
    str.split('').forEach(char => {
        hash = char.charCodeAt(0) + ((hash << 5) - hash);
    });

    let colour = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        // Calculate the blend with white based on transparency
        const blend = Math.round(value * transparency + (255 * (1 - transparency)));
        colour += blend.toString(16).padStart(2, '0');
    }
    return colour;
}

function ColorLegend({ tipus }) {
    return (
        <div
            style={{
                borderRadius: 5,
                backgroundColor: string2color(tipus),
                width: 25,
                height: 15,
            }}
        >
            &nbsp;
        </div>
    )
}

function AttendanceSeries({ passatFirst, filteredEvents, filtersEvents, setFiltersEvents }) {
    const [nVinguts, setNVinguts] = useState({})

    useEffect(() => {
        filteredEvents.forEach(ev => {
            if (!ev.id) return;

            fetchAPI(`/assistencies_event/${ev.id}`, ({ data }) => {
                if (!data) return;

                const han_vingut = data
                    .filter(a => ['Fitxat', 'Vinc'].includes(a.assistencia))
                    .length

                setNVinguts(prev => ({
                    ...prev,
                    [ev.id]: han_vingut
                }))
            })
        })
    }, [
        filteredEvents.length
    ])

    const counts = filteredEvents
        .map(ev => nVinguts?.[ev.id])

    const labels = filteredEvents
        .map(ev => `${moment(ev['data-esperada-inici']).format('DD/MM/YY')} ${ev.title}`)

    const colors = filteredEvents
        .map(ev => [moment() < moment(ev['data-esperada-fi']), ev.tipus])
        .map(([past, tipus]) => string2color(tipus, ((passatFirst && past) || (!passatFirst && !past)) ? 0.5 : 1))

    const minCount = Math.max(0, Math.min(...counts) - 2);
    const maxCount = Math.max(...counts) + 2;

    const data = {
        labels: labels,
        datasets: [{
            label: "Nombre d'assistents",
            data: counts,
            backgroundColor: colors,
        }],
    };

    const options = {
        plugins: {
            legend: {
                display: false,
            },
        },
        scales: {
            y: {
                min: 0,
                max: maxCount,
            },
            x: {
                ticks: {
                    // display: false
                    callback: function(index) {
                        // Use the index to get the label from the labels array
                        let label = labels[index];
                        // Split the label and return the first word
                        return label.split(' ')[0];
                    }
                },
            },
        },
        responsive: true,
        animation: {
            duration: 0,
        },
        maintainAspectRatio: false,
        onClick: function(event, elements, chart) {
            // Check if click was on an actual bar
            if (elements.length > 0) {
                const firstElement = elements[0];
                // Get dataset index and index of the clicked bar
                const datasetIndex = firstElement.datasetIndex;
                const index = firstElement.index;

                const evId = filteredEvents[index].id

                setFiltersEvents(prev => ({
                    ...prev,
                    ids: [...prev.ids, evId]
                }))
            }
        }
    };
    
    return (<>
        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 10 }}>
            { !filtersEvents.assaigs && <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#333', fontSize: 14 }}><ColorLegend tipus="assaig" /> Assaigs</div> }
            { !filtersEvents.actuacions && <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#333', fontSize: 14 }}><ColorLegend tipus="actuació" /> Actuacions</div> }
            { !filtersEvents.activitats && <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#333', fontSize: 14 }}><ColorLegend tipus="activitat" /> Activitats</div> }
        </div>
        <div style={{ width: '100%', height: 300 }}>
            <Bar data={data} options={options} />
        </div>
    </>);
}

export default AttendanceSeries;