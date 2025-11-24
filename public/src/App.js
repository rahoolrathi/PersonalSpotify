import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Volume2, VolumeX, Users, LogOut } from "lucide-react";

export default function LiveKitAudioRoom() {
  const [roomName, setRoomName] = useState("");
  const [userName, setUserName] = useState("");
  const [token, setToken] = useState("");
  const [wsUrl, setWsUrl] = useState("wss://your-livekit-server.com");
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [error, setError] = useState("");

  const roomRef = useRef(null);
  const localTrackRef = useRef(null);

  const joinRoom = async () => {
    if (!roomName || !userName || !token || !wsUrl) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setError("");

      // Import LiveKit SDK dynamically
      const { Room, RoomEvent, Track } = await import(
        "https://cdn.jsdelivr.net/npm/livekit-client@2.0.0/+esm"
      );

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      // Set up event listeners
      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio) {
          const audioElement = track.attach();
          document.body.appendChild(audioElement);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach();
      });

      room.on(RoomEvent.ParticipantConnected, (participant) => {
        updateParticipants(room);
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        updateParticipants(room);
      });

      room.on(RoomEvent.Disconnected, () => {
        setIsConnected(false);
        setParticipants([]);
      });

      // Connect to room
      await room.connect(wsUrl, token);

      // Enable microphone
      await room.localParticipant.setMicrophoneEnabled(true);
      localTrackRef.current = room.localParticipant.audioTrackPublications
        .values()
        .next().value;

      roomRef.current = room;
      setIsConnected(true);
      updateParticipants(room);
    } catch (err) {
      setError(`Failed to join room: ${err.message}`);
      console.error(err);
    }
  };

  const updateParticipants = (room) => {
    const participantList = Array.from(room.remoteParticipants.values()).map(
      (p) => ({
        name: p.identity,
        sid: p.sid,
      })
    );
    participantList.unshift({
      name: room.localParticipant.identity + " (You)",
      sid: room.localParticipant.sid,
    });
    setParticipants(participantList);
  };

  const toggleMute = async () => {
    if (roomRef.current) {
      const newMutedState = !isMuted;
      await roomRef.current.localParticipant.setMicrophoneEnabled(
        !newMutedState
      );
      setIsMuted(newMutedState);
    }
  };

  const leaveRoom = () => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
      localTrackRef.current = null;
      setIsConnected(false);
      setParticipants([]);
      setIsMuted(false);
    }
  };

  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
    };
  }, []);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/20">
          <div className="text-center mb-8">
            <Volume2 className="w-16 h-16 text-blue-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">Audio Room</h1>
            <p className="text-blue-200">Join and listen together</p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                LiveKit Server URL
              </label>
              <input
                type="text"
                value={wsUrl}
                onChange={(e) => setWsUrl(e.target.value)}
                placeholder="wss://your-server.livekit.cloud"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                Room Name
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="my-audio-room"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                Access Token
              </label>
              <textarea
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste your LiveKit token here"
                rows="3"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
              />
            </div>

            <button
              onClick={joinRoom}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-105 shadow-lg"
            >
              Join Room
            </button>
          </div>

          <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
            <p className="text-xs text-blue-200">
              <strong>Note:</strong> You need to set up a LiveKit server and
              generate access tokens. Visit{" "}
              <a
                href="https://livekit.io"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                livekit.io
              </a>{" "}
              to get started.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 w-full max-w-2xl border border-white/20">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse"></div>
            <h1 className="text-3xl font-bold text-white">Connected to Room</h1>
          </div>
          <p className="text-blue-200">
            Room: <span className="font-semibold">{roomName}</span>
          </p>
        </div>

        <div className="bg-white/5 rounded-xl p-6 mb-6 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">
              Participants ({participants.length}/2)
            </h2>
          </div>
          <div className="space-y-2">
            {participants.map((participant) => (
              <div
                key={participant.sid}
                className="flex items-center gap-3 bg-white/10 rounded-lg p-3"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  {participant.name[0].toUpperCase()}
                </div>
                <span className="text-white font-medium">
                  {participant.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={toggleMute}
            className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg ${
              isMuted
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-green-500 hover:bg-green-600 text-white"
            }`}
          >
            {isMuted ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
            {isMuted ? "Unmute" : "Mute"}
          </button>

          <button
            onClick={leaveRoom}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold py-4 px-6 rounded-lg transition-all transform hover:scale-105 shadow-lg"
          >
            <LogOut className="w-5 h-5" />
            Leave Room
          </button>
        </div>

        <div className="mt-6 p-4 bg-green-500/10 rounded-lg border border-green-500/30">
          <p className="text-xs text-green-200">
            <strong>Tip:</strong> Make sure both members use the same room name
            and have valid access tokens with the same room permissions.
          </p>
        </div>
      </div>
    </div>
  );
}
