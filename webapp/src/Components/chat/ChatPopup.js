import React, { useEffect, useState } from "react";
import Popup from "../other/Popup";
import './Chat.css'
import moment from "moment";
import { useRef } from "react";
import { getSubdomain } from "../../utils/utils";
import { useCallback } from "react";
import { downloadImage } from "../../utils/upload-image";

const COLLA = getSubdomain();

function ProfilePic({ user }) {
    const [profilePic, setProfilePic] = useState(null);

    const downloadProfilePic = useCallback(async () => {
        try {
            const base64 = await downloadImage(user, COLLA);
            setProfilePic(base64);
        } catch (e) {
            setProfilePic(false);
        }
    }, [user]);

    useEffect(() => {
        // Get from server
        downloadProfilePic()
    }, [user])

    const profile_pic_style = {
        width: 50,
        height: 50,
        borderRadius: 50,
        objectFit: 'cover',
        objectPosition: 'center',
    };

    return (
        <div className="author-photo">
            <img
                src={profilePic}
                style={profile_pic_style}
                onError={downloadProfilePic}
            />
        </div>
    );
}

function ChatPopup({ socket, popupClosed, setPopupClosed, selectedEvent, selectedBundle, selectedVersio, castellersInfo, userId }) {
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');

    const conversaViewRef = useRef(null);

    useEffect(() => {
        setMessages([]); // Clear messages when changing event/castell/versio

        socket.on('.new_messages', (messages) => {
            setMessages((prevMessages) => [...prevMessages, ...messages.filter(info => info.castell === selectedBundle && parseInt(info.event) === parseInt(selectedEvent) && info.versio === selectedVersio)]);
        });

        socket.on('.deleted_message', (message) => {
            setMessages((prevMessages) => prevMessages.filter((m) => m.id !== message.id));
        });

        if (popupClosed) {
            socket.emit('.leave_chat', { castell: selectedBundle, event: selectedEvent, versio: selectedVersio });
        } else {
            socket.emit('.enter_chat', { castell: selectedBundle, event: selectedEvent, versio: selectedVersio });
        }

        return () => {
            socket.off('.new_messages')
            socket.off('.deleted_message')
            socket.emit('.leave_chat', { castell: selectedBundle, event: selectedEvent, versio: selectedVersio });
        };
    }, [popupClosed, selectedBundle, selectedEvent, selectedVersio]);

    useEffect(() => {
        if (conversaViewRef.current) {
            conversaViewRef.current.scrollTop = conversaViewRef.current.scrollHeight;
        }
    }, [messages, popupClosed]);

    const sendMessage = () => {
        if (inputMessage) {
            socket.emit('.send_messages', [{
              user: userId,
              content: inputMessage,
              castell: selectedBundle,
              event: selectedEvent,
              versio: selectedVersio,
            }]);
            setInputMessage('');
        }
    };

    const isDifferentDay = (currentMessage, previousMessage) => {
        const currentMoment = moment(currentMessage.data);
        const previousMoment = moment(previousMessage.data);
        return !currentMoment.isSame(previousMoment, 'day');
    };

    const isSameAuthor = (currentMessage, previousMessage) => {
        return currentMessage && previousMessage && currentMessage.user === previousMessage.user;
    };

    const isNextSameAuthor = (currentMessage, nextMessage) => {
        return currentMessage && nextMessage && currentMessage.user === nextMessage.user;
    };

    const isMine = (message) => {
        return parseInt(message.user) === parseInt(userId);
    }

    const renderDateSeparator = (date) => (
        <div className="date-separator">
            <span>{moment(date).format('DD/MM/YYYY')}</span>
        </div>
    );    

    const getName = (casteller) =>
        !casteller ? 'Anònim' :
        casteller.mote ? casteller.mote :
        `${casteller.nom} ${casteller.cognom}`

    return (
        <Popup closed={popupClosed} setClosed={setPopupClosed}>
            <div className="chat-popup">
                <div className="conversa-view" ref={conversaViewRef}>
                    <div className="conversa">
                    {
                        messages.map((message, index) => {
                            const casteller = castellersInfo[message.user];
                            if (!casteller) return null;

                            const previousMessage = index > 0 ? messages[index - 1] : null;
                            const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
                            const showDateSeparator = (previousMessage && isDifferentDay(message, previousMessage)) || index === 0;

                            return (
                                <React.Fragment key={message.id}>
                                    {showDateSeparator && renderDateSeparator(message.data)}

                                    <div className={`message-container  ${isMine(message) ? 'isMine' : ''}`}>

                                        {
                                            (!isMine(message) && (!isNextSameAuthor(message, nextMessage) || !nextMessage)) ?
                                                <ProfilePic user={casteller.id} /> :
                                                <div style={{ width: 50 }} />
                                        }

                                        <div className={`message`}>
                                            <div className="message-header">
                                            <div className="message-user">
                                                {(!isMine(message) && !isSameAuthor(message, previousMessage)) && getName(casteller)}
                                            </div>
                                            </div>
                                            <div className="message-content">
                                                {message.content}

                                                <div className="message-date">
                                                    {
                                                        moment(message.data)
                                                            .format('HH:mm')
                                                    }
                                                </div>
                                            </div>
                                        </div>

                                        {
                                            (isMine(message) && (!isNextSameAuthor(message, nextMessage) || !nextMessage)) ?
                                                <ProfilePic user={casteller.id} /> :
                                                <div style={{ width: 50 }} />
                                        }
                                    </div>
                                </React.Fragment>
                            );
                        })
                    }
                    </div>
                </div>
                <div className="message-input-container">
                    <div className="message-input-author">
                        { castellersInfo[userId]?.mote }
                    </div>

                    <input
                        type="text"
                        value={inputMessage}
                        placeholder="Escriu un missatge..."
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyUp={(e) => {
                            if (e.key === 'Enter') {
                                sendMessage();
                            }
                        }}
                    />
                    <button onClick={sendMessage}>Enviar</button>
                </div>
            </div>
        </Popup>
    )
}

export default ChatPopup;