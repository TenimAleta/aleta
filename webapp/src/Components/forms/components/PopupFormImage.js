import { isMobile } from "react-device-detect";
import Popup from "../../other/Popup";
import { BotonsHaPagat } from "../FormResponses";
import { useEffect, useState } from "react";
import { fetchAPI } from "../../../utils/utils";

function PopupFormImage({
    modalIsClosed,
    setModalIsClosed,

    name,
    user,
    element,
    response,

    getOtherQuestionsArray,
    setFocusedResponseInfo,
    recognize,

    evId,
    form,
    statusPagaments,
    setStatusPagaments,
    socket,
}) {
    const [imgsURL, setImgsURL] = useState({})
    const [otherQuestionsArray, setOtherQuestionsArray] = useState(null)
    const [recognitionResults, setRecognitionResults] = useState({})

    const positionInArray = otherQuestionsArray
        ?.findIndex(x => parseInt(x.user) === parseInt(user))

    const next_response = () => {
        if (positionInArray < 0) {
            // setFocusedResponseInfo(otherQuestionsArray[0])
            return;
        }

        if (positionInArray >= otherQuestionsArray.length - 1) {
            // setFocusedResponseInfo(otherQuestionsArray[0])
            return;
        }

        setFocusedResponseInfo(otherQuestionsArray[positionInArray + 1])
    }

    const prev_response = () => {
        if (positionInArray <= 0) {
            // setFocusedResponseInfo(otherQuestionsArray[otherQuestionsArray.length - 1])
            return;
        }

        setFocusedResponseInfo(otherQuestionsArray[positionInArray - 1])
    }

    useEffect(() => {
        if (imgsURL[user] && element?.isComprovant) {
            recognize(imgsURL[user])
                .then(data => setRecognitionResults(prev => ({ ...prev, [user]: data })))
                .catch(() => setRecognitionResults(prev => ({ ...prev, [user]: false })))
        }
    }, [
        imgsURL[user],
    ])

    useEffect(() => {
        if (!element) return;
        setOtherQuestionsArray(getOtherQuestionsArray(element))
    }, [
        element
    ])

    useEffect(() => {
        if (!otherQuestionsArray || !evId || !element?.id) return;

        otherQuestionsArray?.forEach(({ user: userId }) => {
            if (!imgsURL[userId]) {
                fetchAPI(`/form_image_url/${evId}/${element?.id}/${userId}`, (res) => {
                    fetch(res?.url)
                        .then(res => res.text())
                        .then(url => url.indexOf('Error') > 0 ? false : url)
                        .then(data => {
                            setImgsURL(prev => ({ ...prev, [userId]: data }));
                            if (data) {
                                recognize(data)
                                    .then(recognitionData => setRecognitionResults(prev => ({ ...prev, [userId]: recognitionData })))
                                    .catch(() => setRecognitionResults(prev => ({ ...prev, [userId]: false })))
                            }
                        })
                }, false, false)
            }
        });
    }, [
        otherQuestionsArray,
        evId,
        element?.id,
    ])

    useEffect(() => {
        if (element?.id === undefined || evId === undefined || user === undefined) return;

        fetchAPI(`/form_image_url/${evId}/${element?.id}/${user}`, (res) => {
            fetch(res?.url)
                .then(res => res.text())
                .then(url => url.indexOf('Error') > 0 ? false : url)
                .then(data => setImgsURL(prev => ({ ...prev, [user]: data })))
        }, false, false)
    }, [element?.id, evId, user])

    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.key === 'Escape') {
                setModalIsClosed(true)
            } else if (e.key === 'ArrowLeft') {
                prev_response()
            } else if (e.key === 'ArrowRight') {
                next_response()
            }
        };

        window.addEventListener('keyup', handleKeyPress);

        return () => {
            window.removeEventListener('keyup', handleKeyPress);
        };
    }, [
        setModalIsClosed,
        prev_response,
        next_response,
    ]);

    return (
        <Popup
            closed={modalIsClosed}
            setClosed={setModalIsClosed}
            width={isMobile ? '80%' : '70%'}
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 20,
                }}
            >
            <div
                style={{
                    flex: 3,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        gap: 10,
                        margin: 10,
                    }}
                >
                    {
                        !element?.isComprovant || !imgsURL[user] ? null :
                        recognitionResults[user] ? (
                            <>
                                <span>{recognitionResults[user].date || '??/??/????'}</span>
                                <span style={{ fontWeight: 'bold' }}>{recognitionResults[user].import || '?€'}</span>
                            </>
                        ) : recognitionResults[user] === undefined ? 'Llegint...'
                        : 'Error'
                    }
                </div>
                <img
                    src={
                        imgsURL[user] === undefined ? 'https://retchhh.files.wordpress.com/2015/03/loading1.gif' :
                        !imgsURL[user] ? "https://upload.wikimedia.org/wikipedia/commons/a/a3/Image-not-found.png" :
                        imgsURL[user]
                    }
                    alt="Sense imatge"
                    onClick={() => {
                        const image = new Image();
                        image.src = imgsURL[user]

                        const w = window.open('')
                        w.document.write(image.outerHTML)
                    }}
                    style={{
                        width: '100%',
                        border: '1px solid #ccc',
                        borderRadius: 10,
                        cursor: 'zoom-in',
                    }}
                />
            </div>
            <div
                style={{
                    flex: 1,
                    flexDirection: 'column',
                    alignSelf: 'flex-start',
                    marginTop: 50,
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 10,
                    }}
                >
                    <button
                        disabled={positionInArray <= 0}
                        onClick={prev_response}
                    >
                        Anterior
                    </button>
                    <button
                        disabled={positionInArray >= otherQuestionsArray?.length - 1}
                        onClick={next_response}
                    >
                        Següent
                    </button>
                </div>
                <div
                    style={{
                        margin: 10,
                        fontSize: 20,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        backgroundColor: '#eee',
                        borderRadius: 10,
                        padding: 10,
                    }}
                >
                    {name}
                </div>
                {
                    element?.isComprovant === true && (
                        <BotonsHaPagat
                            response={response}
                            form={form}
                            element={element}
                            statusPagaments={statusPagaments}
                            setStatusPagaments={setStatusPagaments}
                            user={user}
                            socket={socket}
                        />
                    )
                }
            </div>
            </div>
        </Popup>
    )
}

export default PopupFormImage;