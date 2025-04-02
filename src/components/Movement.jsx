import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const FollowDrone = ({ position }) => {
    const map = useMap();
    useEffect(() => {
        if (position) map.setView(position, map.getZoom());
    }, [position, map]);
    return null;
};

const FlyToStart = ({ position }) => {
    const map = useMap();
    useEffect(() => {
        if (position) map.flyTo(position, 15);
    }, [position, map]);
    return null;
};

const DroneSimulation = () => {
    const defaultStart = [12.9716, 77.5946]; // Bengaluru
    const [coordinates, setCoordinates] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [manualInput, setManualInput] = useState("");
    const [intervalTime, setIntervalTime] = useState(1000);
    const [isPaused, setIsPaused] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [startPosition, setStartPosition] = useState(defaultStart);
    const [shouldFlyToStart, setShouldFlyToStart] = useState(false);

    const [waypointSearchQuery, setWaypointSearchQuery] = useState("");
    const [waypointSearchResults, setWaypointSearchResults] = useState([]);

    useEffect(() => {
        if (coordinates.length > 0 && !isPaused) {
            const interval = setInterval(() => {
                setCurrentIndex((prev) => (prev < coordinates.length - 1 ? prev + 1 : prev));
            }, intervalTime);
            return () => clearInterval(interval);
        }
    }, [coordinates, intervalTime, isPaused]);

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const rows = text.split("\n").slice(1);
            const data = rows.map((row) => {
                const [timestamp, lat, lon] = row.split(",");
                return { timestamp: new Date(timestamp).getTime(), lat: parseFloat(lat), lon: parseFloat(lon) };
            }).filter(item => !isNaN(item.timestamp) && !isNaN(item.lat) && !isNaN(item.lon));
            data.sort((a, b) => a.timestamp - b.timestamp);
            setCoordinates(data);
            setStartPosition([data[0].lat, data[0].lon]);
            setCurrentIndex(0);
            setShouldFlyToStart(true);
            calculateIntervals(data);
        };
        reader.readAsText(file);
    };

    const handleManualInput = () => {
        const lines = manualInput.split("\n");
        const data = lines.map(line => {
            const [timestamp, lat, lon] = line.split(",");
            return { timestamp: new Date(timestamp).getTime(), lat: parseFloat(lat), lon: parseFloat(lon) };
        }).filter(item => !isNaN(item.timestamp) && !isNaN(item.lat) && !isNaN(item.lon));
        data.sort((a, b) => a.timestamp - b.timestamp);
        setCoordinates(data);
        setStartPosition([data[0].lat, data[0].lon]);
        setCurrentIndex(0);
        setShouldFlyToStart(true);
        calculateIntervals(data);
    };

    const calculateIntervals = (data) => {
        if (data.length > 1) {
            const timeDiffs = data.map((point, index) => {
                if (index === 0) return 1000;
                return (point.timestamp - data[index - 1].timestamp) / 60;
            });
            setIntervalTime(Math.max(timeDiffs[1], 1000));
        }
    };

    const toggleSimulation = () => {
        setIsPaused(prev => !prev);
        if (currentIndex === 0) setShouldFlyToStart(true);
    };

    const restartSimulation = () => {
        setCurrentIndex(0);
        setIsPaused(false);
        if (coordinates.length) {
            setStartPosition([coordinates[0].lat, coordinates[0].lon]);
            setShouldFlyToStart(true);
        }
    };

    const handleSearch = async (query) => {
        if (!query) return;
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
        const data = await res.json();
        setSearchResults(data);
    };

    const selectSearchResult = (place) => {
        const lat = parseFloat(place.lat);
        const lon = parseFloat(place.lon);
        setStartPosition([lat, lon]);
        setCoordinates([]);
        setCurrentIndex(0);
        setSearchResults([]);
        setManualInput("");
    };

    const handleWaypointSearch = async (query) => {
        if (!query) return;
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
        const data = await res.json();
        setWaypointSearchResults(data);
    };

    const addWaypointFromSearch = (place) => {
        const lat = parseFloat(place.lat).toFixed(6);
        const lon = parseFloat(place.lon).toFixed(6);
        const timestamp = new Date().toISOString();
        const newLine = `${timestamp},${lat},${lon}`;
        setManualInput((prev) => (prev ? prev + "\n" + newLine : newLine));
        setWaypointSearchQuery("");
        setWaypointSearchResults([]);
    };

    const dronePosition = coordinates.length ? [coordinates[currentIndex].lat, coordinates[currentIndex].lon] : null;

    return (
        <div className="flex h-screen">
            <div className="w-2/5 p-4 overflow-y-auto space-y-4 bg-gray-50">
                <div>
                    <h1 class="mb-4 text-4xl font-extrabold leading-none tracking-tight text-blue-600 md:text-5xl lg:text-5xl dark:text-white"><span class="text-green-600 dark:text-green-600">Drone Simulation</span></h1>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Upload CSV File</label>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            className="hover:bg-green-600 hover:cursor-pointer w-full border-2  rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 hover"
                        />
                    </div>
                    <h1 className="w-full text-center justify-center">OR</h1>
                    <div>
                        <label className="block text-sm font-medium  mb-1">Manual Coordinates Input</label>
                        <textarea
                            rows="3"
                            className="w-full border-2  rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter timestamp,latitude,longitude manually (one per line)"
                            value={manualInput}
                            onChange={(e) => setManualInput(e.target.value)}
                        />
                    </div>
                </div>

                <h4 className="mt-2 font-semibold">Add coordinates by searching location on Map.</h4>
                <div>
                    <input
                        type="text"
                        placeholder="Search for a location."
                        className="w-full py-1 px-2 border rounded"
                        value={waypointSearchQuery}
                        onChange={(e) => {
                            setWaypointSearchQuery(e.target.value);
                            handleWaypointSearch(e.target.value);
                        }}
                    />
                    {waypointSearchResults.length > 0 && (
                        <ul className="bg-white border rounded  max-h-40 overflow-y-auto">
                            {waypointSearchResults.slice(0, 5).map((place, idx) => (
                                <li key={idx} className="p-1 cursor-pointer hover:bg-gray-100" onClick={() => addWaypointFromSearch(place)}>
                                    {place.display_name}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <h4 className="mt-2 font-semibold">Add the starting point.</h4>
                <div className="flex space-x-2">

                    <div className="w-[70%]">
                        <input
                            type="text"
                            placeholder="Search starting point."
                            className="w-full py-1 px-2 border rounded "
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                handleSearch(e.target.value);
                            }}
                        />
                        {searchResults.length > 0 && (
                            <ul className="bg-white border rounded  max-h-40 overflow-y-auto">
                                {searchResults.slice(0, 5).map((place, idx) => (
                                    <li
                                        key={idx}
                                        className="p-1 cursor-pointer hover:bg-gray-100"
                                        onClick={() => selectSearchResult(place)}
                                    >
                                        {place.display_name}
                                    </li>
                                ))}
                            </ul>
                        )}


                    </div>
                    <div className="w-[30%]">
                        <button
                            onClick={handleManualInput}
                            className="hover:cursor-pointer hover:bg-blue-700 w-full px-2 py-1 bg-blue-600 text-white rounded"
                        >
                            Load Start
                        </button>
                    </div>
                </div>






                <div className="space-x-2">
                    <button onClick={toggleSimulation} className="hover:scale-105 hover:cursor-pointer hover:bg-green-900 px-4 py-2 bg-green-800 text-white rounded">{isPaused ? "Resume" : "Pause"}</button>
                    <button onClick={restartSimulation} className="hover:scale-105 hover:cursor-pointer hover:bg-green-600 px-4 py-2 bg-green-500 text-white rounded">Restart</button>
                </div>
            </div>

            <div className="w-3/5">
                <MapContainer center={startPosition} zoom={15} style={{ height: "100%", width: "100%" }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {shouldFlyToStart && <FlyToStart position={startPosition} />}
                    {dronePosition && <FollowDrone position={dronePosition} />}
                    {!coordinates.length && <Marker position={startPosition} />}
                    {coordinates.length > 0 && (
                        <>
                            <Polyline positions={coordinates.map((c) => [c.lat, c.lon])} color="blue" />
                            <Marker position={dronePosition} />
                        </>
                    )}
                </MapContainer>
            </div>
        </div>
    );
};

export default DroneSimulation;
