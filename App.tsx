import React, { useState, useEffect, useRef, memo } from "react";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  MonitorUp,
  PhoneOff,
  Settings,
  Copy,
  Plus,
  LogIn,
  AlertCircle,
  Users,
  Info,
  Clock,
  Maximize2,
  Minimize2,
  User as UserIcon,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { Participant } from "./types";

declare const Peer: any;

interface JoinRequest {
  id: string;
  name: string;
  connection: any;
}

interface VideoTileProps {
  stream: MediaStream | null;
  name: string;
  isLocal?: boolean;
  isMicOn?: boolean;
  isCamOn?: boolean;
  isScreenSharing?: boolean;
  isPinned?: boolean;
  onPin?: () => void;
  mini?: boolean;
}

const VideoTile = memo(
  ({
    stream,
    name,
    isLocal = false,
    isMicOn = true,
    isCamOn = true,
    isScreenSharing = false,
    isPinned = false,
    onPin,
    mini = false,
  }: VideoTileProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
      if (videoRef.current && stream && videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
    }, [stream]);

    const isPresentation =
      name.toLowerCase().includes("presentasi") || isScreenSharing;
    const videoFitClass = isPresentation
      ? "object-contain bg-[#1a1c1e]"
      : isLocal
      ? "object-cover scale-x-[-1]"
      : "object-cover";

    return (
      <div
        className={`relative rounded-2xl overflow-hidden group shadow-xl border ${
          isPinned && !mini
            ? "border-blue-500/50 ring-2 ring-blue-500/20"
            : "border-gray-700/40"
        } bg-[#1a1c1e] h-full w-full transition-all duration-300 flex items-center justify-center`}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full transition-opacity duration-500 ${videoFitClass} ${
            isCamOn || isPresentation ? "opacity-100" : "opacity-0"
          }`}
        />

        {!isCamOn && !isPresentation && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#282a2d]">
            <div
              className={`${
                mini
                  ? "h-10 w-10 text-xs"
                  : "h-16 w-16 md:h-28 md:w-28 text-xl md:text-4xl"
              } rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-bold shadow-2xl border-2 border-white/10 uppercase`}
            >
              {name.charAt(0)}
            </div>
          </div>
        )}

        <div
          className={`absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 ${
            mini ? "scale-90 origin-left" : ""
          } z-10`}
        >
          {!isPresentation &&
            (isMicOn ? (
              <Mic className="h-3 w-3 text-white" />
            ) : (
              <MicOff className="h-3 w-3 text-red-500" />
            ))}
          <span className="text-[10px] md:text-xs font-medium text-white/90 truncate max-w-[60px] md:max-w-[150px]">
            {isLocal ? "Anda" : name}
          </span>
        </div>

        {onPin && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPin();
            }}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/5 hover:bg-blue-600 transition-all opacity-0 group-hover:opacity-100 z-10"
          >
            {isPinned ? (
              <Minimize2 className="h-3 w-3 md:h-4 md:w-4" />
            ) : (
              <Maximize2 className="h-3 w-3 md:h-4 md:w-4" />
            )}
          </button>
        )}
      </div>
    );
  }
);

const App: React.FC = () => {
  const [inMeeting, setInMeeting] = useState(false);
  const [meetingCode, setMeetingCode] = useState("");
  const [myId, setMyId] = useState("");
  const [myName, setMyName] = useState("Host");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joinNameInput, setJoinNameInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteParticipants, setRemoteParticipants] = useState<Participant[]>(
    []
  );
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const [isRequesting, setIsRequesting] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);

  // Timer State
  const [meetingDuration, setMeetingDuration] = useState("00:00");
  const meetingStartTimeRef = useRef<number | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<any>(null);
  const screenPeerRef = useRef<any>(null);
  const activeCallsRef = useRef<Map<string, any>>(new Map());
  const activePeersRef = useRef<Set<string>>(new Set());
  const dataConnsRef = useRef<Map<string, any>>(new Map());

  // Meeting Duration Timer Effect
  useEffect(() => {
    let interval: number;
    if (inMeeting) {
      interval = window.setInterval(() => {
        if (meetingStartTimeRef.current) {
          const diff = Math.floor(
            (Date.now() - meetingStartTimeRef.current) / 1000
          );
          const positiveDiff = Math.max(0, diff); // Mencegah angka negatif jika ada clock skew kecil
          const hours = Math.floor(positiveDiff / 3600);
          const minutes = Math.floor((positiveDiff % 3600) / 60);
          const seconds = positiveDiff % 60;

          let durationString = "";
          if (hours > 0)
            durationString += `${hours.toString().padStart(2, "0")}:`;
          durationString += `${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}`;

          setMeetingDuration(durationString);
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [inMeeting]);

  const removeParticipant = (id: string) => {
    setRemoteParticipants((prev) => prev.filter((p) => p.id !== id));
    if (pinnedId === id) setPinnedId(null);
    activeCallsRef.current.get(id)?.close();
    activeCallsRef.current.delete(id);
    activePeersRef.current.delete(id.replace("-screen", ""));
    dataConnsRef.current.delete(id);
  };

  const addParticipant = (
    id: string,
    stream: MediaStream,
    customName?: string
  ) => {
    const isPresentation = id.includes("-screen");
    const baseName = id.replace("-screen", "").slice(0, 4);
    const displayName =
      customName ||
      (isPresentation ? `User ${baseName} (Presentasi)` : `User ${baseName}`);

    stream.getTracks().forEach((track) => {
      track.onended = () => removeParticipant(id);
    });

    setRemoteParticipants((prev) => {
      if (prev.find((p) => p.id === id)) return prev;
      return [...prev, { id, name: displayName, stream }];
    });

    if (isPresentation) setPinnedId(id);
  };

  const initPeer = (id: string, targetId?: string, currentName?: string) => {
    const peer = new Peer(id);
    peerRef.current = peer;
    const nameToShare = currentName || myName;

    peer.on("open", (openedId: string) => {
      if (targetId && openedId !== targetId) {
        setIsRequesting(true);
        const conn = peer.connect(targetId);
        conn.on("open", () => {
          conn.send({
            type: "JOIN_REQUEST",
            name: nameToShare,
            peerId: openedId,
          });
        });

        conn.on("data", async (data: any) => {
          if (data.type === "JOIN_APPROVED") {
            setIsRequesting(false);
            setInMeeting(true);

            // Set waktu mulai dari Host agar sinkron
            if (data.meetingStartTime) {
              meetingStartTimeRef.current = data.meetingStartTime;
            }

            if (localStreamRef.current) {
              const call = peer.call(targetId, localStreamRef.current, {
                metadata: { name: nameToShare },
              });
              handleCall(call, targetId);
            }
            if (data.existingPeers && Array.isArray(data.existingPeers)) {
              data.existingPeers.forEach((p: { id: string; name: string }) => {
                if (p.id !== openedId && localStreamRef.current) {
                  const call = peer.call(p.id, localStreamRef.current, {
                    metadata: { name: nameToShare },
                  });
                  handleCall(call, p.id);
                }
              });
            }
          } else if (data.type === "JOIN_REJECTED") {
            setIsRequesting(false);
            setError("Host menolak permintaan bergabung Anda.");
            peer.destroy();
          }
        });
      }
    });

    peer.on("connection", (conn: any) => {
      dataConnsRef.current.set(conn.peer, conn);
      conn.on("data", (data: any) => {
        if (data.type === "JOIN_REQUEST") {
          setPendingRequests((prev) => [
            ...prev,
            { id: data.peerId, name: data.name, connection: conn },
          ]);
        }
      });
      conn.on("close", () => dataConnsRef.current.delete(conn.peer));
    });

    peer.on("call", (call: any) => {
      const isPresentationCall =
        call.peer.includes("-screen") || isScreenSharing;
      call.answer(
        isPresentationCall
          ? screenStreamRef.current || null
          : localStreamRef.current,
        {
          metadata: { name: nameToShare },
        }
      );
      handleCall(call, call.peer);
    });

    peer.on("error", (err: any) => {
      if (err.type === "peer-unavailable") {
        setError("Rapat tidak ditemukan atau Host sudah keluar.");
        setIsRequesting(false);
      }
    });
  };

  const handleCall = (call: any, remoteId: string) => {
    activeCallsRef.current.set(remoteId, call);
    activePeersRef.current.add(remoteId.replace("-screen", ""));
    call.on("stream", (remoteStream: MediaStream) => {
      if (remoteStream && remoteStream.getTracks().length > 0) {
        addParticipant(remoteId, remoteStream, call.metadata?.name);
      } else if (remoteId.includes("-screen")) {
        removeParticipant(remoteId);
      }
    });
    call.on("close", () => removeParticipant(remoteId));
  };

  const startLocalMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      localStreamRef.current = stream;
      return stream;
    } catch (err) {
      setError("Gagal mengakses kamera atau mikrofon.");
      throw err;
    }
  };

  const createMeeting = async () => {
    try {
      await startLocalMedia();
      const code = Math.random().toString(36).substring(2, 7).toUpperCase();
      setMeetingCode(code);
      setMyId(code);
      setMyName("Host");
      setInMeeting(true);
      // Host menentukan waktu mulai rapat
      meetingStartTimeRef.current = Date.now();
      initPeer(code);
    } catch (e) {}
  };

  const joinMeeting = async () => {
    if (!joinCodeInput || !joinNameInput) return;
    try {
      setError(null);
      await startLocalMedia();
      setMeetingCode(joinCodeInput);
      setMyName(joinNameInput);
      const randomId =
        "U-" + Math.random().toString(36).substring(2, 7).toUpperCase();
      setMyId(randomId);
      initPeer(randomId, joinCodeInput, joinNameInput);
    } catch (e) {}
  };

  const approveRequest = (requestId: string) => {
    const request = pendingRequests.find((r) => r.id === requestId);
    if (request) {
      const existingPeers = remoteParticipants.map((p) => ({
        id: p.id,
        name: p.name,
      }));
      existingPeers.push({ id: myId, name: myName });

      request.connection.send({
        type: "JOIN_APPROVED",
        existingPeers: existingPeers,
        // Kirim waktu mulai rapat ke user baru
        meetingStartTime: meetingStartTimeRef.current,
      });
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    }
  };

  const rejectRequest = (requestId: string) => {
    const request = pendingRequests.find((r) => r.id === requestId);
    if (request) {
      request.connection.send({ type: "JOIN_REJECTED" });
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsMicOn(track.enabled);
      }
    }
  };

  const toggleCam = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsCamOn(track.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      screenPeerRef.current?.destroy();
      setIsScreenSharing(false);
      if (pinnedId === "my-screen") setPinnedId(null);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        screenStreamRef.current = stream;
        setIsScreenSharing(true);
        setPinnedId("my-screen");
        const screenPeerId = `${myId}-screen`;
        const sPeer = new Peer(screenPeerId);
        screenPeerRef.current = sPeer;
        sPeer.on("open", () => {
          if (meetingCode && myId !== meetingCode) {
            sPeer.call(meetingCode, stream, {
              metadata: { name: myName + " (Presentasi)" },
            });
          }
          activePeersRef.current.forEach((peerId) => {
            if (peerId !== myId) {
              sPeer.call(peerId, stream, {
                metadata: { name: myName + " (Presentasi)" },
              });
            }
          });
        });
        stream.getVideoTracks()[0].onended = () => {
          if (isScreenSharing) toggleScreenShare();
        };
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (isRequesting) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-[#202124] text-white">
        <div className="text-center space-y-6 max-w-sm animate-in fade-in zoom-in duration-300">
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 rounded-full border-4 border-blue-500/10"></div>
            <Loader2 className="w-24 h-24 text-blue-500 animate-spin" />
          </div>
          <h2 className="text-2xl font-semibold">Meminta bergabung...</h2>
          <p className="text-gray-400">
            Harap tunggu, Host sedang meninjau permintaan Anda.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-red-400 font-medium hover:text-red-300 transition-colors pt-4"
          >
            Batalkan
          </button>
        </div>
      </div>
    );
  }

  if (!inMeeting) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-[#202124] text-white font-sans">
        <div className="max-w-4xl w-full flex flex-col md:flex-row gap-8 md:gap-12 items-center">
          <div className="flex-1 space-y-6 text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-light leading-tight tracking-tight">
              Rapat video premium.
              <br />
              <span className="text-gray-400 font-normal">
                Kini gratis untuk semua.
              </span>
            </h1>
            <p className="text-base md:text-lg text-gray-400">
              Hubungkan tim Anda dengan video call yang aman dan berkualitas
              tinggi langsung dari browser.
            </p>
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-lg flex items-center gap-3 text-sm mx-auto md:mx-0 max-w-sm">
                <AlertCircle className="h-5 w-5 shrink-0" /> {error}
              </div>
            )}
            <div className="space-y-4 pt-4">
              <div className="flex justify-center md:justify-start">
                <button
                  onClick={createMeeting}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 px-8 py-3.5 rounded-lg font-semibold transition-all shadow-xl active:scale-95 w-full sm:w-auto"
                >
                  <Plus className="h-5 w-5" /> Buat Rapat Baru
                </button>
              </div>
              <div className="flex items-center gap-4 text-gray-500 my-4">
                <div className="h-[1px] flex-1 bg-gray-700"></div>
                <span className="text-xs uppercase font-bold">
                  atau gabung rapat
                </span>
                <div className="h-[1px] flex-1 bg-gray-700"></div>
              </div>
              <div className="flex flex-col gap-3 max-w-sm mx-auto md:mx-0">
                <div className="relative flex items-center">
                  <UserIcon className="absolute left-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Nama Anda"
                    value={joinNameInput}
                    onChange={(e) => setJoinNameInput(e.target.value)}
                    className="bg-transparent border border-gray-600 rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:border-blue-500 w-full transition-colors text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="relative flex items-center flex-1">
                    <LogIn className="absolute left-3 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Kode Rapat"
                      value={joinCodeInput}
                      onChange={(e) =>
                        setJoinCodeInput(e.target.value.toUpperCase())
                      }
                      className="bg-transparent border border-gray-600 rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:border-blue-500 w-full transition-colors text-sm"
                    />
                  </div>
                  <button
                    onClick={joinMeeting}
                    disabled={!joinCodeInput || !joinNameInput}
                    className="bg-white/5 hover:bg-white/10 text-blue-400 font-semibold disabled:opacity-30 disabled:text-gray-500 px-6 py-3 rounded-lg transition-all border border-gray-700"
                  >
                    Gabung
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="hidden md:flex flex-1 justify-center">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
              <div className="relative w-64 h-64 lg:w-80 lg:h-80 rounded-full bg-[#202124] flex items-center justify-center border border-white/10 shadow-2xl">
                <div className="text-center">
                  <VideoIcon className="h-20 w-20 text-blue-500 mx-auto mb-4 animate-pulse" />
                  <p className="text-gray-400 font-medium">
                    Siap untuk memulai?
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isAnyPinned = pinnedId !== null;
  const pinnedParticipant =
    pinnedId === "my-screen"
      ? null
      : remoteParticipants.find((p) => p.id === pinnedId);

  return (
    <div className="flex h-[100dvh] flex-col bg-[#202124] text-white overflow-hidden relative">
      {/* Join Requests Overlay */}
      {pendingRequests.length > 0 && (
        <div className="absolute top-16 md:top-20 right-4 z-[100] w-full max-w-[280px] space-y-3">
          {pendingRequests.map((request) => (
            <div
              key={request.id}
              className="bg-[#1a1c1e]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-right duration-300"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-sm font-bold shadow-lg">
                  {request.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{request.name}</p>
                  <p className="text-[10px] text-gray-400 font-medium">
                    Meminta bergabung...
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => approveRequest(request.id)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-lg"
                >
                  <Check className="h-3.5 w-3.5" /> Terima
                </button>
                <button
                  onClick={() => rejectRequest(request.id)}
                  className="flex-1 bg-white/5 hover:bg-white/10 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-white/10"
                >
                  <X className="h-3.5 w-3.5" /> Tolak
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <header className="flex h-12 md:h-16 items-center justify-between px-4 md:px-6 border-b border-gray-800/50 flex-shrink-0 z-30">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="h-7 w-7 md:h-9 md:w-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <VideoIcon className="text-white h-4 w-4 md:h-5 md:w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm md:text-lg font-bold leading-none tracking-tight">
                Meet Pro
              </span>
              <span className="text-[7px] md:text-[10px] text-blue-400 font-bold tracking-widest uppercase mt-0.5">
                Live Conference
              </span>
            </div>
          </div>

          {/* Meeting Timer Display */}
          <div className="h-6 w-[1px] bg-gray-700 mx-1 hidden sm:block"></div>
          <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
            <Clock className="h-3 w-3 text-blue-400" />
            <span className="text-xs md:text-sm font-mono font-bold text-gray-200">
              {meetingDuration}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex items-center gap-1.5 bg-gray-800/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-gray-700/50">
            <span className="text-[10px] md:text-sm font-bold tracking-widest text-blue-100">
              {meetingCode}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(meetingCode);
                alert("Kode disalin!");
              }}
              className="p-0.5 hover:bg-white/10 rounded-full transition-colors"
            >
              <Copy className="h-3 w-3 text-gray-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container dengan layout responsif grid */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden p-2 md:p-3 gap-2 md:gap-3 min-h-0 relative">
        {/* Stage Area (Main Video / Share Screen) */}
        <div
          className={`transition-all duration-500 ease-in-out ${
            isAnyPinned ? "h-[40vh] md:h-full md:flex-[4]" : "flex-1"
          } min-h-0 flex-shrink-0 z-10`}
        >
          {isAnyPinned ? (
            <VideoTile
              stream={
                pinnedId === "my-screen"
                  ? screenStreamRef.current
                  : pinnedId === "me"
                  ? localStreamRef.current
                  : pinnedParticipant?.stream || null
              }
              name={
                pinnedId === "my-screen"
                  ? `${myName} (Presentasi)`
                  : pinnedId === "me"
                  ? myName
                  : pinnedParticipant?.name || ""
              }
              isLocal={pinnedId === "me" || pinnedId === "my-screen"}
              isMicOn={pinnedId === "me" ? isMicOn : true}
              isCamOn={pinnedId === "me" ? isCamOn : true}
              isScreenSharing={pinnedId === "my-screen"}
              isPinned={true}
              onPin={() => setPinnedId(null)}
            />
          ) : (
            <div
              className={`grid w-full h-full gap-2 ${
                remoteParticipants.length === 0
                  ? "grid-cols-1"
                  : remoteParticipants.length === 1
                  ? "grid-cols-1 md:grid-cols-2"
                  : remoteParticipants.length <= 3
                  ? "grid-cols-2"
                  : "grid-cols-2 lg:grid-cols-3"
              }`}
            >
              <VideoTile
                stream={localStreamRef.current}
                name={myName}
                isLocal={true}
                isMicOn={isMicOn}
                isCamOn={isCamOn}
                onPin={() => setPinnedId("me")}
              />
              {remoteParticipants.map((participant) => (
                <VideoTile
                  key={participant.id}
                  stream={participant.stream}
                  name={participant.name}
                  onPin={() => setPinnedId(participant.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar / Participant Strip - Mobile: Grid 2 Columns, Desktop: Side Column */}
        {isAnyPinned && (
          <div className="flex-1 overflow-y-auto md:w-1/4 lg:w-1/5 scrollbar-hide">
            <div className="grid grid-cols-2 md:grid-cols-1 gap-2 pb-4">
              {pinnedId !== "me" && (
                <div className="aspect-video md:h-36 lg:h-44 flex-shrink-0">
                  <VideoTile
                    stream={localStreamRef.current}
                    name={myName}
                    isLocal={true}
                    isMicOn={isMicOn}
                    isCamOn={isCamOn}
                    onPin={() => setPinnedId("me")}
                    mini={true}
                  />
                </div>
              )}
              {isScreenSharing && pinnedId !== "my-screen" && (
                <div className="aspect-video md:h-36 lg:h-44 flex-shrink-0">
                  <VideoTile
                    stream={screenStreamRef.current}
                    name={`${myName} (Presentasi)`}
                    isLocal={true}
                    isCamOn={true}
                    onPin={() => setPinnedId("my-screen")}
                    mini={true}
                  />
                </div>
              )}
              {remoteParticipants.map(
                (participant) =>
                  pinnedId !== participant.id && (
                    <div
                      key={participant.id}
                      className="aspect-video md:h-36 lg:h-44 flex-shrink-0"
                    >
                      <VideoTile
                        stream={participant.stream}
                        name={participant.name}
                        onPin={() => setPinnedId(participant.id)}
                        mini={true}
                      />
                    </div>
                  )
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="h-20 md:h-28 flex items-center justify-between px-4 md:px-12 bg-[#202124] flex-shrink-0 z-20 pb-4 md:pb-0">
        <div className="hidden lg:flex flex-col">
          <span className="text-xl font-medium tracking-tight">
            {new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em]">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </span>
        </div>

        <div className="flex items-center justify-center flex-1 md:flex-none gap-2.5 md:gap-5">
          <button
            onClick={toggleMic}
            className={`p-3 md:p-5 rounded-full transition-all border border-gray-700/50 shadow-lg ${
              isMicOn
                ? "bg-[#3c4043] hover:bg-[#434649]"
                : "bg-red-500 hover:bg-red-600 ring-4 ring-red-500/20"
            }`}
          >
            {isMicOn ? (
              <Mic className="h-5 w-5 md:h-6 md:w-6" />
            ) : (
              <MicOff className="h-5 w-5 md:h-6 md:w-6 text-white" />
            )}
          </button>

          <button
            onClick={toggleCam}
            className={`p-3 md:p-5 rounded-full transition-all border border-gray-700/50 shadow-lg ${
              isCamOn
                ? "bg-[#3c4043] hover:bg-[#434649]"
                : "bg-red-500 hover:bg-red-600 ring-4 ring-red-500/20"
            }`}
          >
            {isCamOn ? (
              <VideoIcon className="h-5 w-5 md:h-6 md:w-6" />
            ) : (
              <VideoOff className="h-5 w-5 md:h-6 md:w-6 text-white" />
            )}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`p-3 md:p-5 rounded-full transition-all border border-gray-700/50 shadow-lg ${
              isScreenSharing
                ? "bg-blue-600 ring-4 ring-blue-600/20"
                : "bg-[#3c4043] hover:bg-[#434649]"
            }`}
          >
            <MonitorUp
              className={`h-5 w-5 md:h-6 md:w-6 ${
                isScreenSharing ? "text-white" : "text-gray-300"
              }`}
            />
          </button>

          <button
            onClick={() => window.location.reload()}
            className="p-3 md:p-5 rounded-full bg-red-600 hover:bg-red-700 transition-all shadow-2xl active:scale-90 flex items-center justify-center ring-4 ring-red-600/10"
          >
            <PhoneOff className="h-5 w-5 md:h-6 md:w-6 text-white" />
          </button>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-800/40 backdrop-blur-md px-4 py-2 rounded-full border border-gray-700/30">
            <Users className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-bold text-gray-200">
              {remoteParticipants.length + 1}
            </span>
          </div>
          <button className="p-3 rounded-full hover:bg-white/5 text-gray-400 transition-colors">
            <Info className="h-5 w-5" />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
