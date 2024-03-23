import { useEffect, useRef, useState } from "react";
import { useReactMediaRecorder } from "react-media-recorder";

function Recorder({ socket }) {
    const { status, startRecording, stopRecording, mediaBlobUrl } = useReactMediaRecorder({ audio: true });

    const fileUpload = useRef(null)

    const [transcription, setTranscription] = useState(null)
    const [list, setList] = useState(null)

    useEffect(() => {
        socket.on('.text_from_audio', res => setTranscription(res))
        socket.on('.list_from_text', res => setList(res))
    }, [])

    useEffect(() => {
        if (mediaBlobUrl) {
            fetch(mediaBlobUrl)
                .then(r => r.blob())
                .then(blob => socket.emit('.new_recording', blob))
        }
    }, [mediaBlobUrl])

    const uploadAudio = () => {
        const blob = fileUpload.current.files[0]
        socket.emit('.new_recording', blob)
        setTranscription('Processant...')
    }

    useEffect(() => {
        if (list === null && transcription !== null && transcription !== 'Processant...') {
            setList('Processant...')
        }
    }, [transcription])

    return (
        <div>
            {/* <p>{status}</p>
            <button onClick={startRecording}>Start Recording</button>
            <button onClick={stopRecording}>Stop Recording</button>
            <audio src={mediaBlobUrl} controls /> */}

            <h1>Puja un àudio i te'l processem</h1>

            <input type="file" ref={fileUpload} onChange={uploadAudio} accept='audio/*' />

            { transcription !== null && <div>
                <h3>Text</h3>
                <div>{transcription}</div>
            </div> }

            { list !== null && <div>
                <h3>Llista</h3>
                <div>
                    {list.split('\n').map(el =>
                        <div key={el}>
                            { 
                                el.includes(':') ? <strong>{el}</strong> :
                                el.includes('-') ? <div style={{ paddingLeft: 20 }}>{el}</div> :
                                <div>{el}</div>
                            }
                        </div>
                    )}
                </div>
            </div> }
        </div>
    )
}

export default Recorder;