import React,
{ useEffect, useState } from 'react';
import './App.css';

function useTyping(words, typingSpeed = 100, pause = 800, deletingSpeed = 40) {
  const [text, setText] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() =>
  {
  let timeout;
  const currentWord = words[wordIndex % words.length];

    if (!isDeleting)
      {
      // typing
      timeout = setTimeout(() =>
        {
        setText(current => current + currentWord.charAt(current.length));
        }, typingSpeed);
        if (text === currentWord)
        {
        timeout = setTimeout(() => setIsDeleting(true), pause);
        }
      }
      else
      {
      // deleting
      timeout = setTimeout(() =>
      {
        setText(current => current.slice(0, -1));
      }, deletingSpeed);
      if (text === '')
      {
        setIsDeleting(false);
        // Always advance sequentially to the next message
        setWordIndex(i => i + 1);
      }
    }

    return () => clearTimeout(timeout);
    // We intentionally include text and isDeleting here.
  }, [text, isDeleting, wordIndex, words, typingSpeed, pause, deletingSpeed]);

  return text;
}

function App()
{
  const messages = 
  [
    "I'm still learning React you fucking idiot.",
    "This will be a cool site once i figure out how to do this shit.",
    "STILL A WORK IN PROGRESS GO AWAY!!",
    "AHHHHHHHHHHHHHHHHHHHHHHH",
  ];
  // Edit the messages array above to add/remove messages; they will cycle sequentially.
  const typed = useTyping(messages, 60, 700, 30);

  return (
    <div className="App">
      <header className="App-header">
        <img src="/Heart.png" className="Heart-image" alt="heart" />
        <p className="typing">
          <span>{typed}</span>
          <span className="typing-cursor" aria-hidden="true">|</span>
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
