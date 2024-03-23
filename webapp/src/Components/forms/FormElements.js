// FormElements.js
import React, { useEffect } from 'react';
import './FormEditorStyles.css';
import { fetchAPI, getSubdomain, postAPI } from '../../utils/utils';
import { useState } from 'react';

const COLLA = getSubdomain();

const MultipleChoiceQuestion = ({ element, updateElement, removeElement, errors }) => {
  const { content } = element;

  const updateQuestion = (e) => {
    updateElement({ ...element, content: { ...content, question: e.target.value } });
  };

  const updateOption = (index, value) => {
    const newOptions = content.options.map((option, i) =>
      i === index ? value : option,
    );
    updateElement({ ...element, content: { ...content, options: newOptions } });
  };

  const addOption = () => {
    updateElement({
      ...element,
      content: { ...content, options: [...content.options, ''] },
    });
  };

  const removeOption = (index) => {
    const newOptions = content.options.filter((_, i) => i !== index);
    updateElement({ ...element, content: { ...content, options: newOptions } });
  };

  return (
    <>
      <input
        type="text"
        value={content.question}
        onChange={updateQuestion}
        placeholder="Resposta d'una única opció"
        className={(errors.question ? 'error' : '') + ' question'}
      />
      {errors.question && <p className="error-text">{errors.question}</p>}

      <div className="options-container">
        {content.options.map((option, index) => (
        <div key={index} className="option-container">
            <input disabled type="radio" name={`question_${element.id}`} id={`option_${index}`} />
            <label htmlFor={`option_${index}`}>
            <input
                type="text"
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                placeholder={`Opció ${index + 1}`}
                className="option-input"
            />
            { errors[`option_${index}`] && <p className="error-text">{errors[`option_${index}`]}</p> }
            </label>
            {/* <button className='remove-option' onClick={() => removeOption(index)}>🗑️</button> */}
        </div>
        ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
          <button onClick={addOption}>Afegeix una altra opció</button>
          <button className="delete" onClick={removeElement}>🗑️</button>
        </div>
    </>
  );
};

const CheckboxQuestion = ({ element, updateElement, removeElement, errors }) => {
    const { content } = element;
  
    const updateQuestion = (e) => {
      updateElement({ ...element, content: { ...content, question: e.target.value } });
    };
  
    const updateOption = (index, value) => {
      const newOptions = content.options.map((option, i) =>
        i === index ? value : option,
      );
      updateElement({ ...element, content: { ...content, options: newOptions } });
    };
  
    const addOption = () => {
      updateElement({
        ...element,
        content: { ...content, options: [...content.options, ''] },
      });
    };
  
    const removeOption = (index) => {
      const newOptions = content.options.filter((_, i) => i !== index);
      updateElement({ ...element, content: { ...content, options: newOptions } });
    };
  
    return (
    <>
        <input
          type="text"
          value={content.question}
          onChange={updateQuestion}
          placeholder="Resposta amb múltiples opcions"
            className={(errors.question ? 'error' : '') + ' question'}
        />
        {errors.question && <p className="error-text">{errors.question}</p>}
      <div className="options-container">
        {content.options.map((option, index) => (
            <div key={index} className="option-container">
                <input disabled type="checkbox" id={`option_${index}`} />
                <label htmlFor={`option_${index}`}>
                  <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Opció ${index + 1}`}
                      className="option-input"
                  />
                  { errors[`option_${index}`] && <p className="error-text">{errors[`option_${index}`]}</p> }
                </label>
                {/* <button className='remove-option' onClick={() => removeOption(index)}>🗑️</button> */}
            </div>
        ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
          <button onClick={addOption}>Afegeix una altra opció</button>
          <button className="delete" onClick={removeElement}>🗑️</button>
        </div>
      </>
    );
  };
 
const ShortAnswerQuestion = ({ element, updateElement, removeElement, errors }) => {
  const { content } = element;

  const updateQuestion = (e) => {
    updateElement({ ...element, content: { ...content, question: e.target.value } });
  };

  return (
    <>
      <input
        type="text"
        value={content.question}
        onChange={updateQuestion}
        placeholder="Pregunta de resposta curta"
        className={(errors.question ? 'error' : '') + ' question'}
      />
      {errors.question && <p className="error-text">{errors.question}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <button className="delete" onClick={removeElement}>🗑️</button>
      </div>
    </>
  );
};

const ParagraphQuestion = ({ element, updateElement, removeElement, errors }) => {
  const { content } = element;

  const updateQuestion = (e) => {
    updateElement({ ...element, content: { ...content, question: e.target.value } });
  };

  return (
    <>
      <input
        type="text"
        value={content.question}
        onChange={updateQuestion}
        placeholder="Pregunta de resposta llarga"
        className={(errors.question ? 'error' : '') + ' question'}
      />
      {errors.question && <p className="error-text">{errors.question}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <button className="delete" onClick={removeElement}>🗑️</button>
      </div>
    </>
  );
};

const ImageUploadQuestion = ({ element, updateElement, removeElement, errors }) => {
  const { content } = element;

  const updateQuestion = (e) => {
    updateElement({ ...element, content: { ...content, question: e.target.value } });
  };

  return (
    <>
      {
        element?.isComprovant && <p style={{ fontSize: 14, marginBottom: 20, fontStyle: 'italic' }}>
          Només demanarà el comprovant si l'usuari ha de pagar més de 0€.
        </p>
      }
      <input
        type="text"
        value={content?.question || ""}
        onChange={updateQuestion}
        placeholder={element?.isComprovant ? "Proposta de títol: Penja el comprovant del pagament" : "Títol de la imatge a pujar"}
        className={(errors.question ? 'error' : '') + ' question'}
      />
      <input
        type="file"
        disabled
        style={{
          marginTop: 10,
        }}
      />
      {errors.question && <p className="error-text">{errors.question}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <button className="delete" onClick={removeElement}>🗑️</button>
      </div>
    </>
  );
};

const TextElement = ({ element, updateElement, removeElement, errors }) => {
  const { content } = element;

  const updateText = (e) => {
    updateElement({ ...element, content: e.target.value });
  };

  return (
    <>
      <textarea
        value={content}
        onChange={updateText}
        placeholder="Afegeix text sense pregunta"
        className={errors.text ? 'error' : '' + ' question'}
      ></textarea>
      {errors.text && <p className="error-text">{errors.text}</p>}
      <p style={{ fontSize: 10 }}>Pots utilitzar: <span style={{ color: 'darkblue' }}>{['{nom}', '{cognom}', '{sobrenom}'].join(', ')}</span> als textos.</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <button className="delete" onClick={removeElement}>🗑️</button>
      </div>
    </>
  );
};

const ImageElement = ({ selectedEvent, element, updateElement, removeElement, errors }) => {
  const { content } = element;
  const [imageURL, setImageURL] = useState(null);

  useEffect(() => {
    if (!selectedEvent) return;

    fetchAPI(`/form_image_url/${selectedEvent}/${element.id}`, ({ elementId, url }) => {
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error('Error fetching image from S3');
          return res.text();
        })
        .then((data) => {
          setImageURL(data);
        })
        .catch((err) => {
          // Not found
        })
    }, false, false)
  }, [
    selectedEvent,
    element.id,
  ])

  const uploadFormImage = async (base64, formId, elementId, callback) => {
    postAPI('/upload_form_image', {
      base64,
      formId,
      elementId,
    }, ({ url }) => {
      callback(url);
    })
  }

  return (
    <>
      {
        imageURL &&
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            margin: 10,
            marginBottom: 30,
          }}
        >
          <img
            src={imageURL}
            style={{
              maxWidth: '50%',
              borderRadius: 10,
            }}
          />
        </div>
      }

      <label
        htmlFor={`image_${element.id}`}
        style={{
          fontWeight: 'bold',
        }}
      >
        {
          imageURL ?
          'Canvia la imatge:' :
          'Afegeix una imatge:'
        }
      </label>

      <input
        type="file"
        id={`image_${element.id}`}
        onChange={(e) => {
          const file = e.target.files[0];
          const reader = new FileReader();

          reader.onload = () => {
            uploadFormImage(reader.result, selectedEvent, element.id, () => {
              setImageURL(reader.result);
            })
          };

          reader.readAsDataURL(file);
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <button className="delete" onClick={removeElement}>🗑️</button>
      </div>
    </>
  );
};


const TicketQuestion = ({ element, updateElement, removeElement, errors }) => {
  const { content } = element;

  const removeTiquet = (data) => {
    const isRemoved = removeElement(data)
    if (!isRemoved) return;

    postAPI('/remove_tiquet', { id: element.id })
  }

  const updateQuestion = (e) => {
    updateElement({ ...element, content: { ...content, question: e.target.value } });
  };

  const updateOption = (index, value) => {
    const newOptions = content.options.map((option, i) =>
      i === index ? value : option,
    );
    updateElement({ ...element, content: { ...content, options: newOptions } });
  };

  return (
    <>
      <input
        type="text"
        value={content.question}
        onChange={updateQuestion}
        placeholder="Nom del pagament"
        className={(errors.question ? 'error' : '') + ' question'}
      />
      {errors.question && <p className="error-text">{errors.question}</p>}
      <p style={{ fontSize: 11, color: '#777' }}>Quan la gent respongui la primera opció, s'afegiran a la llista de "demanats" per aquest pagament.</p>
      <div className="options-container">
        {content.options.map((option, index) => (
            <div key={index} className="option-container">
                <input
                  disabled
                  checked={index === 0}
                  type="checkbox"
                  id={`option_${index}`}
                />
                <label htmlFor={`option_${index}`}>
                  <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={index === 0 ? 'Opció 1 (demanats)' : `Opció ${index + 1}`}
                      className="option-input"
                  />
                  { errors[`option_${index}`] && <p className="error-text">{errors[`option_${index}`]}</p> }
                </label>
                {
                  index === 0 &&
                  <>
                    <input
                      type="number"
                      value={element.price}
                      onChange={(e) => {
                        updateElement({ ...element, price: e.target.value })
                      }}
                      placeholder="Preu"
                      className="option-input"
                      style={{ width: 75, flexGrow: 0, marginLeft: 10 }}
                      min={0}
                    />
                    €
                  </>
                }
            </div>
        ))}
        </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <button className="delete" onClick={removeTiquet}>🗑️</button>
      </div>
    </>
  );
};

const ResumPagamentsQuestion = ({ element, updateElement, removeElement, errors }) => {
  const { content } = element;

  return (
    <>
      <h2>Resum de pagaments</h2>
      <p style={{ fontSize: 14 }}>Es farà la suma de tots els pagaments demanats per l'usuari.</p>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <button className="delete" onClick={removeElement}>🗑️</button>
      </div>
    </>
  );
};

const CopiableTextQuestion = ({ element, updateElement, removeElement, errors }) => {
  const { content } = element;

  const updateQuestion = (e) => {
    updateElement({ ...element, content: { ...content, question: e.target.value } });
  };

  const updateText = (e) => {
    updateElement({ ...element, content: { ...content, text: e.target.value } });
  };

  return (
    <>
      <input
        type="text"
        value={content.question || ''}
        onChange={updateQuestion}
        placeholder="Títol de la pregunta"
        className={(errors.question ? 'error' : '') + ' question'}
      />
      {errors.question && <p className="error-text">{errors.question}</p>}
      <input
        type="text"
        value={content.text || ''}
        onChange={updateText}
        placeholder="Text per copiar"
        className={(errors.text ? 'error' : '') + ' question'}
        style={{ marginTop: 5, backgroundColor: 'rgba(0,0,255,0.1)', color: '#555' }}
      />
      {errors.text && <p className="error-text">{errors.text}</p>}
      <p style={{ fontSize: 10 }}>Pots utilitzar: <span style={{ color: 'darkblue' }}>{['{nom}', '{cognom}', '{sobrenom}'].join(', ')}</span> als textos per copiar.</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <button className="delete" onClick={removeElement}>🗑️</button>
      </div>
    </>
  );
};

export {
    MultipleChoiceQuestion,
    CheckboxQuestion,
    ShortAnswerQuestion,
    ParagraphQuestion,
    ImageUploadQuestion,
    TextElement,
    CopiableTextQuestion,
    TicketQuestion,
    ImageElement,
    ResumPagamentsQuestion,
};

export const MultipleChoiceQuestionPreview = ({ element }) => {
  return (
    <div>
      <h3>{element.content.question}</h3>
      {element.content.options.map((option, index) => (
        <div key={index}>
          <input type="radio" id={`${element.id}-${index}`} name={element.id} disabled />
          <label htmlFor={`${element.id}-${index}`}>{option}</label>
        </div>
      ))}
    </div>
  );
};

export const CheckboxQuestionPreview = ({ element }) => {
  return (
    <div>
      <h3>{element.content.question}</h3>
      {element.content.options.map((option, index) => (
        <div key={index}>
          <input type="checkbox" id={`${element.id}-${index}`} name={element.id} disabled />
          <label htmlFor={`${element.id}-${index}`}>{option}</label>
        </div>
      ))}
    </div>
  );
};

export const ShortAnswerQuestionPreview = ({ element }) => {
  return (
    <div>
      <h3>{element.content.question}</h3>
      <input type="text" readOnly placeholder={'Resposta de curta durada'} />
    </div>
  );
};

export const ParagraphQuestionPreview = ({ element }) => {
  return (
    <div>
      <h3>{element.content.question}</h3>
      <textarea style={{ fontSize: 13 }} readOnly placeholder={'Resposta de llarga durada'} />
    </div>
  );
};

export const TextElementPreview = ({ element }) => {
  return <h4 style={{ fontWeight: 'normal' }}>
    {element.content}
  </h4>;
};

export const ImageUploadQuestionPreview = ({ element }) => {
  return (
    <div>
      <h3>{element.content.question}</h3>
      <input type="file" disabled />
    </div>
  );
};

export const ResumPagamentsQuestionPreview = ({ element }) => {
  return (
    <div>
      <h3>Resum de pagaments</h3>
      <p>Es farà la suma dels pagaments demanats.</p>
    </div>
  );
}

export const CopiableTextQuestionPreview = ({ element }) => {
  const copyToClipboard = async (text) => {
    // Copy to clipboard logic
  };

  return (
    <div>
      <h3>{element.content.question}</h3>
      <input type="text" readOnly value={element.content.text} style={{ backgroundColor: 'rgba(0,0,255,0.1)', color: '#555' }} />
    </div>
  );
};

export const TicketQuestionPreview = ({ element }) => {
  return (
    <div>
      <h3>{element.content.question}</h3>
      {element.content.options.map((option, index) => (
        <div key={index}>
          <input checked={index === 0} type="checkbox" id={`${element.id}-${index}`} name={element.id} disabled />
          <label htmlFor={`${element.id}-${index}`}>{option}</label>
        </div>
      ))}
    </div>
  );
}

export const ImagePreview = ({ selectedEvent, element }) => {
  const [imageURL, setImageURL] = useState(null);

  useEffect(() => {
    fetchAPI(`/form_image_url/${selectedEvent}/${element.id}`, ({ elementId, url }) => {
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error('Error fetching image from S3');
          return res.text();
        })
        .then((data) => {
          setImageURL(data);
        })
        .catch((err) => {
          // Not found
        })
    }, false, false)
  }, [
    selectedEvent,
    element.id,
  ])

  return (
    <div>
      <img
        src={imageURL}
        style={{ maxWidth: '100%' }}
      />
    </div>
  );
}