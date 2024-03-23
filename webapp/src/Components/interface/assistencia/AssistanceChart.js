import { Bar } from 'react-chartjs-2';
import { applyTimeZone } from './LlistaAssistencies';
import moment from 'moment';

function AssistanceChart({ assistencies, eventInfo, castellersInfo, socket }) {
    const startTime = moment(eventInfo.data_inici).toDate()
    const endTime = moment(eventInfo.data_fi).toDate()
    const timeBins = Array.from({length: Math.ceil((endTime - startTime) / (15 * 60 * 1000))}, (_, i) => 
        applyTimeZone(startTime.getTime() + i * 15 * 60 * 1000).toDate()
    )

    const counts = timeBins.map(timeBin => {
        return assistencies.reduce((count, assist) => {
            if (assist.assist >= 1 && assist.entrada <= timeBin && assist.sortida > timeBin) {
                return count + 1;
            }
            return count;
        }, 0);
    });

    const minCount = Math.max(0, Math.min(...counts) - 2);
    const maxCount = Math.max(...counts) + 2;

    const data = {
        labels: timeBins.map(bin => bin.toTimeString().substring(0, 5)),
        datasets: [{
            label: "Nombre d'assistents",
            data: counts,
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
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
                min: minCount,
                max: maxCount,
            },
        },
        responsive: true,
        maintainAspectRatio: false,
    };
    
    return (
        <div style={{ width: '100%', height: '100%' }}>
            <Bar data={data} options={options} />
        </div>
    );
}

export default AssistanceChart;