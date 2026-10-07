import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polyline,
  useMap
} from "react-leaflet";

import {
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from "firebase/auth";

import { auth, googleProvider } from "./firebase";

import "leaflet/dist/leaflet.css";
import "./App.css";

const DEFAULT_CENTER = [30.900965, 75.857277];

/* =====================================================
   MUNICIPAL WORKER EMAILS
   Add the Google account(s) that should see
   the municipal dashboard.
   ===================================================== */

const MUNICIPAL_EMAILS = [
  // "municipal@example.com"
];

/* =====================================================
   CLEANUP LOCATIONS
   ===================================================== */

const cleanupLocations = [
  {
    id: 1,
    title: "Waste Hotspot",
    location: "Main Road Community Area",
    waste: "Mixed plastic & household waste",
    volunteers: 8,
    lat: 30.9045,
    lng: 75.8505
  },
  {
    id: 2,
    title: "Park Cleanup",
    location: "Community Park",
    waste: "Plastic bottles & wrappers",
    volunteers: 14,
    lat: 30.8965,
    lng: 75.864
  },
  {
    id: 3,
    title: "Recycling Drive",
    location: "Market Area",
    waste: "Plastic, cardboard & metal",
    volunteers: 21,
    lat: 30.9105,
    lng: 75.866
  }
];

/* =====================================================
   MAP CONTROLLER
   ===================================================== */

function MapController({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();

      if (center) {
        map.setView(center, zoom || 14);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [center, zoom, map]);

  return null;
}

/* =====================================================
   APP
   ===================================================== */

function App() {
  /* ===================================================
     AUTH
     =================================================== */

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [activePage, setActivePage] = useState("home");

  const isMunicipal =
    user &&
    MUNICIPAL_EMAILS
      .map((email) => email.toLowerCase())
      .includes((user.email || "").toLowerCase());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setAuthLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setLoginLoading(true);
      setAuthError("");

      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Google login error:", error);

      if (error.code === "auth/popup-closed-by-user") {
        setAuthError("Google sign-in was cancelled.");
      } else if (error.code === "auth/popup-blocked") {
        setAuthError(
          "Your browser blocked the Google login popup. Please allow popups for WasteFlow."
        );
      } else {
        setAuthError(
          "Could not sign in with Google. Please try again."
        );
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setActivePage("home");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  /* ===================================================
     GENERAL DATA
     =================================================== */

  const [showReport, setShowReport] = useState(false);

  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const [location, setLocation] = useState("");
  const [gettingLocation, setGettingLocation] = useState(false);

  const [submitted, setSubmitted] = useState(false);

  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  /* ===================================================
     USER-SPECIFIC DATA
     =================================================== */

  const storageKey = user
    ? `wasteflow_user_${user.uid}`
    : null;

  const [greenPoints, setGreenPoints] = useState(0);

  const [cleanupCompleted, setCleanupCompleted] =
    useState(0);

  const [plantationStarted, setPlantationStarted] =
    useState(false);

  const [plantationDay, setPlantationDay] =
    useState(0);

  const [achievements, setAchievements] =
    useState([]);

  const [leaderboard, setLeaderboard] = useState([
    {
      name: "Eco Warrior",
      points: 180
    },
    {
      name: "Green Guardian",
      points: 150
    },
    {
      name: "Clean City",
      points: 125
    }
  ]);

  useEffect(() => {
    if (!storageKey) return;

    try {
      const saved =
        JSON.parse(
          localStorage.getItem(storageKey)
        ) || {};

      setGreenPoints(saved.greenPoints || 0);
      setCleanupCompleted(
        saved.cleanupCompleted || 0
      );
      setPlantationStarted(
        saved.plantationStarted || false
      );
      setPlantationDay(
        saved.plantationDay || 0
      );
      setAchievements(
        saved.achievements || []
      );
    } catch (error) {
      console.error(
        "Could not load account data:",
        error
      );
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;

    const data = {
      greenPoints,
      cleanupCompleted,
      plantationStarted,
      plantationDay,
      achievements
    };

    localStorage.setItem(
      storageKey,
      JSON.stringify(data)
    );
  }, [
    storageKey,
    greenPoints,
    cleanupCompleted,
    plantationStarted,
    plantationDay,
    achievements
  ]);

  const addPoints = (points) => {
    setGreenPoints(
      (previous) => previous + points
    );
  };

  const addAchievement = (achievement) => {
    setAchievements((previous) => {
      if (previous.includes(achievement)) {
        return previous;
      }

      return [...previous, achievement];
    });
  };

  /* ===================================================
     MAP
     =================================================== */

  const [showMap, setShowMap] = useState(false);

  const [userLocation, setUserLocation] =
    useState(null);

  const [selectedCleanup, setSelectedCleanup] =
    useState(null);

  const [routeCoordinates, setRouteCoordinates] =
    useState([]);

  const [routeLoading, setRouteLoading] =
    useState(false);

  const [mapMessage, setMapMessage] =
    useState("");

  /* ===================================================
     CLEANUP
     =================================================== */

  const [cleanupJoined, setCleanupJoined] =
    useState([]);

  const [showCleanupMission, setShowCleanupMission] =
    useState(false);

  const [cleanupBefore, setCleanupBefore] =
    useState(null);

  const [cleanupAfter, setCleanupAfter] =
    useState(null);

  const [cleanupBeforePreview, setCleanupBeforePreview] =
    useState(null);

  const [cleanupAfterPreview, setCleanupAfterPreview] =
    useState(null);

  const [cleanupChecking, setCleanupChecking] =
    useState(false);

  const [cleanupVerified, setCleanupVerified] =
    useState(false);

  const [cleanupPercent, setCleanupPercent] =
    useState(null);

  const [cleanupEvidenceStatus, setCleanupEvidenceStatus] =
    useState("");

  /* ===================================================
     PLANTATION
     =================================================== */

  const [showPlantation, setShowPlantation] =
    useState(false);

  const [plantationPhoto, setPlantationPhoto] =
    useState(null);

  const [plantationPreview, setPlantationPreview] =
    useState(null);

  const [plantationChecking, setPlantationChecking] =
    useState(false);

  const [plantationVerified, setPlantationVerified] =
    useState(false);

  /* ===================================================
     MUNICIPAL
     =================================================== */

  const [municipalStatus, setMunicipalStatus] =
    useState({});

  /* ===================================================
     LOAD REPORTS
     =================================================== */

  const loadReports = async () => {
    try {
      setLoadingReports(true);

      const response = await fetch(
        "https://wasteflow-backend-cp1x.onrender.com/reports"
      );

      const data = await response.json();

      setReports(data.reports || []);
    } catch (error) {
      console.error(
        "Could not load reports:",
        error
      );
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadReports();
    }
  }, [user]);

  /* ===================================================
     MUNICIPAL STATUS
     =================================================== */

  const updateMunicipalStatus = (
    reportId,
    status
  ) => {
    setMunicipalStatus((previous) => ({
      ...previous,
      [reportId]: status
    }));
  };

  /* ===================================================
     USER LOCATION
     =================================================== */

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setMapMessage(
        "Location is not supported by this device."
      );
      return;
    }

    setMapMessage(
      "Getting your location..."
    );

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = [
          position.coords.latitude,
          position.coords.longitude
        ];

        setUserLocation(coords);

        setMapMessage(
          "Your location detected."
        );
      },
      () => {
        setMapMessage(
          "Location permission was not granted. You can still browse cleanup locations."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  /* ===================================================
     MAP
     =================================================== */

  const openMap = () => {
    setShowMap(true);
    setSelectedCleanup(null);
    setRouteCoordinates([]);
    setMapMessage("");

    setTimeout(() => {
      getUserLocation();
    }, 300);
  };

  const closeMap = () => {
    setShowMap(false);
    setRouteCoordinates([]);
    setSelectedCleanup(null);
  };

  const selectCleanup = (cleanup) => {
    setSelectedCleanup(cleanup);
    setRouteCoordinates([]);
    setMapMessage("");
  };

  /* ===================================================
     ROUTE
     =================================================== */

  const getRoute = async () => {
    if (!selectedCleanup) return;

    if (!userLocation) {
      setMapMessage(
        "Please allow location access first."
      );

      getUserLocation();
      return;
    }

    try {
      setRouteLoading(true);
      setMapMessage(
        "Calculating route..."
      );

      const start =
        `${userLocation[1]},${userLocation[0]}`;

      const end =
        `${selectedCleanup.lng},${selectedCleanup.lat}`;

      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`
      );

      const data = await response.json();

      if (
        !data.routes ||
        !data.routes.length
      ) {
        throw new Error(
          "Route unavailable"
        );
      }

      const route = data.routes[0];

      const coordinates =
        route.geometry.coordinates.map(
          (point) => [
            point[1],
            point[0]
          ]
        );

      setRouteCoordinates(
        coordinates
      );

      const distanceKm =
        (route.distance / 1000).toFixed(1);

      const durationMin =
        Math.round(
          route.duration / 60
        );

      setMapMessage(
        `${distanceKm} km • approximately ${durationMin} min`
      );
    } catch (error) {
      console.error(error);

      setMapMessage(
        "Could not calculate the route. Please try again."
      );
    } finally {
      setRouteLoading(false);
    }
  };

  /* ===================================================
     JOIN CLEANUP
     =================================================== */

  const joinCleanup = (cleanup) => {
    if (
      !cleanupJoined.includes(
        cleanup.id
      )
    ) {
      setCleanupJoined(
        (previous) => [
          ...previous,
          cleanup.id
        ]
      );
    }

    setSelectedCleanup(cleanup);
    setShowMap(false);
    setShowCleanupMission(true);

    setCleanupBefore(null);
    setCleanupAfter(null);
    setCleanupBeforePreview(null);
    setCleanupAfterPreview(null);

    setCleanupVerified(false);
    setCleanupPercent(null);
    setCleanupEvidenceStatus("");
  };

  /* ===================================================
     CLEANUP BEFORE
     =================================================== */

  const handleCleanupBefore = (event) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    setCleanupBefore(file);

    setCleanupBeforePreview(
      URL.createObjectURL(file)
    );

    setCleanupVerified(false);
  };

  /* ===================================================
     CLEANUP AFTER
     =================================================== */

  const handleCleanupAfter = (event) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    setCleanupAfter(file);

    setCleanupAfterPreview(
      URL.createObjectURL(file)
    );

    setCleanupVerified(false);
  };

  /* ===================================================
     CLEANUP VERIFICATION

     IMPORTANT:
     This is currently a DEMO verification flow.
     It does not claim forensic authenticity.
     =================================================== */

  const verifyCleanup = async () => {
    if (
      !cleanupBefore ||
      !cleanupAfter
    ) {
      alert(
        "Please upload both BEFORE and AFTER photos."
      );
      return;
    }

    setCleanupChecking(true);
    setCleanupEvidenceStatus("");

    setTimeout(() => {
      setCleanupChecking(false);

      setCleanupVerified(true);
      setCleanupPercent(78);

      setCleanupEvidenceStatus(
        "Review Required — demo verification only. Photo authenticity is not forensically verified."
      );

      addPoints(40);

      setCleanupCompleted(
        (previous) =>
          previous + 1
      );

      addAchievement(
        "Verified Cleanup"
      );
    }, 1800);
  };

  /* ===================================================
     PLANTATION
     =================================================== */

  const openPlantation = () => {
    setShowPlantation(true);
  };

  const handlePlantationPhoto = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    setPlantationPhoto(file);

    setPlantationPreview(
      URL.createObjectURL(file)
    );

    setPlantationVerified(false);
  };

  const startPlantation = () => {
    if (!plantationPhoto) {
      alert(
        "Please upload a plantation photo first."
      );
      return;
    }

    setPlantationChecking(true);

    setTimeout(() => {
      setPlantationChecking(false);

      setPlantationStarted(true);
      setPlantationVerified(true);
      setPlantationDay(0);

      addPoints(10);

      addAchievement(
        "Plantation Started"
      );
    }, 1800);
  };

  /* ===================================================
     REPORT
     =================================================== */

  const openReport = () => {
    setShowReport(true);

    setSubmitted(false);
    setAnalysis(null);
    setImage(null);
    setImageFile(null);
    setLocation("");
  };

  const closeReport = () => {
    setShowReport(false);
  };

  const handleImageUpload = (
    event
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    setImageFile(file);

    setImage(
      URL.createObjectURL(file)
    );

    setAnalysis(null);
    setSubmitted(false);
  };

  /* ===================================================
     AI ANALYSIS
     =================================================== */

  const analyzeWaste = async () => {
    if (!imageFile) {
      alert(
        "Please upload an image first."
      );
      return;
    }

    try {
      setAnalyzing(true);

      const formData =
        new FormData();

      formData.append(
        "image",
        imageFile
      );

      const response =
        await fetch(
          "https://wasteflow-backend-cp1x.onrender.com/analyze",
          {
            method: "POST",
            body: formData
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Analysis failed"
        );
      }

      setAnalysis(data);
    } catch (error) {
      console.error(error);

      alert(
        "AI analysis failed. Make sure Node and Python servers are running."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  /* ===================================================
     REPORT LOCATION
     =================================================== */

  const getLocation = () => {
    if (!navigator.geolocation) {
      alert(
        "Location is not supported."
      );
      return;
    }

    setGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const latitude =
            position.coords.latitude;

          const longitude =
            position.coords.longitude;

          const response =
            await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );

          const data =
            await response.json();

          setLocation(
            data.display_name ||
            "Location detected"
          );
        } catch {
          setLocation(
            "Location detected"
          );
        } finally {
          setGettingLocation(false);
        }
      },
      () => {
        setGettingLocation(false);

        alert(
          "Please allow location access."
        );
      }
    );
  };

  /* ===================================================
     SUBMIT REPORT
     =================================================== */

  const submitReport = async () => {
    if (!analysis) return;

    try {
      const response =
        await fetch(
          "https://wasteflow-backend-cp1x.onrender.com/reports",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              type: analysis.type,
              confidence:
                analysis.confidence,
              severity:
                analysis.severity,
              recyclable:
                analysis.recyclable,
              recovery:
                analysis.recovery,
              action:
                analysis.action,
              location:
                location ||
                "Location not provided",
              userEmail:
                user?.email || "",
              userName:
                user?.displayName || ""
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
          "Could not submit report"
        );
      }

      setSubmitted(true);

      addPoints(10);

      addAchievement(
        "Waste Reporter"
      );

      await loadReports();
    } catch (error) {
      console.error(error);

      alert(
        "Could not submit waste report."
      );
    }
  };

  /* ===================================================
     NAVIGATION
     =================================================== */

  const navigate = (page) => {
    setActivePage(page);

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  /* ===================================================
     LEADERBOARD
     =================================================== */

  const currentLeaderboard =
    useMemo(() => {
      const currentUserName =
        user?.displayName ||
        "You";

      const entries = [
        ...leaderboard,
        {
          name: currentUserName,
          points: greenPoints,
          currentUser: true
        }
      ];

      return entries
        .sort(
          (a, b) =>
            b.points - a.points
        )
        .slice(0, 5);
    }, [
      leaderboard,
      greenPoints,
      user
    ]);

  /* ===================================================
     STATS
     =================================================== */

  const completedMissions =
    cleanupCompleted +
    (plantationStarted ? 1 : 0);

  const certificateUnlocked =
    plantationStarted &&
    plantationDay >= 100;

  /* ===================================================
     AUTH LOADING
     =================================================== */

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5faf7",
          fontFamily:
            "Arial, sans-serif"
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "30px"
          }}
        >
          <div
            style={{
              fontSize: "48px",
              marginBottom: "15px"
            }}
          >
            🌱
          </div>

          <h2>
            Loading WasteFlow...
          </h2>

          <p>
            Connecting your account
          </p>
        </div>
      </div>
    );
  }

  /* ===================================================
     LOGIN
     =================================================== */

  if (!user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(135deg,#eef9f1 0%,#ffffff 55%,#e8f6ee 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily:
            "Arial, sans-serif"
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "430px",
            background: "#fff",
            borderRadius: "28px",
            padding: "38px 30px",
            boxShadow:
              "0 20px 60px rgba(20,80,50,.12)",
            textAlign: "center"
          }}
        >
          <div
            style={{
              width: "76px",
              height: "76px",
              borderRadius: "24px",
              background: "#e5f7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin:
                "0 auto 20px",
              fontSize: "42px"
            }}
          >
            🌱
          </div>

          <p
            style={{
              color: "#16834f",
              fontWeight: "700",
              letterSpacing: "1.5px",
              fontSize: "12px"
            }}
          >
            AI-POWERED ENVIRONMENTAL PLATFORM
          </p>

          <h1
            style={{
              fontSize: "38px",
              margin:
                "0 0 12px",
              color: "#163b2a"
            }}
          >
            WasteFlow
          </h1>

          <p
            style={{
              color: "#66756d",
              lineHeight: "1.6",
              marginBottom: "30px"
            }}
          >
            Report waste, complete
            verified environmental
            missions and build your
            Green Passport.
          </p>

          <button
            onClick={
              handleGoogleLogin
            }
            disabled={loginLoading}
            style={{
              width: "100%",
              border:
                "1px solid #d9e1dc",
              background: "#fff",
              borderRadius: "14px",
              padding: "15px 18px",
              fontSize: "16px",
              fontWeight: "700",
              cursor: loginLoading
                ? "wait"
                : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px"
            }}
          >
            <span
              style={{
                fontSize: "22px"
              }}
            >
              G
            </span>

            {loginLoading
              ? "Signing in..."
              : "Continue with Google"}
          </button>

          {authError && (
            <div
              style={{
                marginTop: "18px",
                padding: "12px",
                borderRadius: "10px",
                background: "#fff2f2",
                color: "#b42318",
                fontSize: "13px"
              }}
            >
              {authError}
            </div>
          )}

          <p
            style={{
              marginTop: "25px",
              fontSize: "12px",
              color: "#8a968f"
            }}
          >
            Secure Google account
            authentication. No separate
            WasteFlow password is required.
          </p>
        </div>
      </div>
    );
  }

  /* ===================================================
     MUNICIPAL DASHBOARD
     =================================================== */

  if (isMunicipal) {
    const pending =
      reports.filter(
        (report) =>
          !municipalStatus[report.id] ||
          municipalStatus[report.id] ===
            "Pending"
      );

    const inProgress =
      reports.filter(
        (report) =>
          municipalStatus[report.id] ===
          "In Progress"
      );

    const completed =
      reports.filter(
        (report) =>
          municipalStatus[report.id] ===
          "Completed"
      );

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f5f8f6",
          fontFamily:
            "Arial, sans-serif"
        }}
      >
        <nav
          style={{
            background: "#123b2a",
            color: "#fff",
            padding:
              "18px 6%",
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            gap: "20px",
            flexWrap: "wrap"
          }}
        >
          <div>
            <strong
              style={{
                fontSize: "22px"
              }}
            >
              🌱 WasteFlow
            </strong>

            <div
              style={{
                fontSize: "12px",
                opacity: .75,
                marginTop: "3px"
              }}
            >
              MUNICIPAL OPERATIONS
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px"
            }}
          >
            <span
              style={{
                fontSize: "13px"
              }}
            >
              🏛️{" "}
              {user.displayName ||
                "Municipal Worker"}
            </span>

            <button
              onClick={handleLogout}
              style={{
                border:
                  "1px solid rgba(255,255,255,.35)",
                background:
                  "transparent",
                color: "#fff",
                padding:
                  "9px 14px",
                borderRadius: "9px",
                cursor: "pointer"
              }}
            >
              Sign Out
            </button>
          </div>
        </nav>

        <main
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            padding:
              "40px 6%"
          }}
        >
          <p
            style={{
              color: "#16834f",
              fontWeight: "700",
              fontSize: "12px",
              letterSpacing: "1px"
            }}
          >
            WORKER DASHBOARD
          </p>

          <h1
            style={{
              margin:
                "5px 0 10px",
              color: "#163b2a"
            }}
          >
            Municipal Operations
          </h1>

          <p
            style={{
              color: "#66756d"
            }}
          >
            Review community reports,
            accept work and update
            completion status.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(190px,1fr))",
              gap: "15px",
              margin:
                "30px 0"
            }}
          >
            <DashboardStat
              icon="🟠"
              label="Pending"
              value={pending.length}
            />

            <DashboardStat
              icon="🔵"
              label="In Progress"
              value={inProgress.length}
            />

            <DashboardStat
              icon="🟢"
              label="Completed"
              value={completed.length}
            />
          </div>

          <div
            style={{
              display: "grid",
              gap: "18px"
            }}
          >
            {reports.length === 0 ? (
              <div
                style={{
                  background: "#fff",
                  borderRadius: "18px",
                  padding: "45px",
                  textAlign: "center"
                }}
              >
                <div
                  style={{
                    fontSize: "42px"
                  }}
                >
                  ✓
                </div>

                <h3>
                  No waste reports
                </h3>

                <p>
                  New community reports
                  will appear here.
                </p>

                <button
                  className="primary-btn"
                  onClick={
                    loadReports
                  }
                >
                  Refresh
                </button>
              </div>
            ) : (
              reports.map(
                (report) => {
                  const status =
                    municipalStatus[
                      report.id
                    ] ||
                    "Pending";

                  return (
                    <div
                      key={report.id}
                      style={{
                        background: "#fff",
                        borderRadius:
                          "18px",
                        padding:
                          "24px",
                        boxShadow:
                          "0 5px 20px rgba(0,0,0,.05)"
                      }}
                    >
                      <div
                        style={{
                          display:
                            "flex",
                          justifyContent:
                            "space-between",
                          gap: "15px",
                          flexWrap:
                            "wrap"
                        }}
                      >
                        <div>
                          <span
                            style={{
                              fontSize:
                                "12px",
                              fontWeight:
                                "700",
                              color:
                                "#16834f"
                            }}
                          >
                            REPORT #
                            {report.id}
                          </span>

                          <h3>
                            ♻️{" "}
                            {report.type}
                          </h3>

                          <p>
                            <strong>
                              📍 Location:
                            </strong>{" "}
                            {report.location}
                          </p>

                          <p>
                            <strong>
                              Severity:
                            </strong>{" "}
                            {report.severity}
                          </p>

                          <p>
                            <strong>
                              Recovery:
                            </strong>{" "}
                            {report.recovery}
                          </p>
                        </div>

                        <StatusBadge
                          status={
                            status
                          }
                        />
                      </div>

                      <div
                        style={{
                          display:
                            "flex",
                          gap: "10px",
                          flexWrap:
                            "wrap",
                          marginTop:
                            "18px"
                        }}
                      >
                        {status ===
                          "Pending" && (
                          <button
                            className="primary-btn"
                            onClick={() =>
                              updateMunicipalStatus(
                                report.id,
                                "In Progress"
                              )
                            }
                          >
                            📍 Accept & Start Work
                          </button>
                        )}

                        {status ===
                          "In Progress" && (
                          <>
                            <button
                              className="primary-btn"
                              onClick={() =>
                                updateMunicipalStatus(
                                  report.id,
                                  "Completed"
                                )
                              }
                            >
                              ✓ Mark Completed
                            </button>

                            <button
                              className="secondary-btn"
                              onClick={() =>
                                alert(
                                  "Photo evidence upload is Coming Soon."
                                )
                              }
                            >
                              📸 Evidence
                            </button>
                          </>
                        )}

                        {status ===
                          "Completed" && (
                          <>
                            <span
                              style={{
                                color:
                                  "#16834f",
                                fontWeight:
                                  "700"
                              }}
                            >
                              ✓ Work completed
                            </span>

                            <button
                              className="secondary-btn"
                              onClick={() =>
                                alert(
                                  "GPS arrival verification is Coming Soon."
                                )
                              }
                            >
                              GPS Verification
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                }
              )
            )}
          </div>

          <div
            style={{
              marginTop: "30px",
              padding: "20px",
              borderRadius: "16px",
              background:
                "#edf7f0",
              color:
                "#345344"
            }}
          >
            <strong>
              🚧 Coming Soon
            </strong>

            <p
              style={{
                marginBottom: 0
              }}
            >
              Secure worker assignment,
              GPS arrival verification,
              photo evidence upload and
              persistent municipal workflow
              will be connected to the
              production backend.
            </p>
          </div>
        </main>
      </div>
    );
  }

  /* ===================================================
     CITIZEN APP
     =================================================== */

  return (
    <div className="app">

      {/* ================= NAV ================= */}

      <nav className="navbar">
        <div
          className="logo"
          onClick={() =>
            navigate("home")
          }
          style={{
            cursor: "pointer"
          }}
        >
          🌱 WasteFlow
        </div>

        <div className="nav-links">
          <button
            onClick={() =>
              navigate("home")
            }
          >
            Home
          </button>

          <button
            onClick={() =>
              navigate("missions")
            }
          >
            Missions
          </button>

          <button
            onClick={() =>
              navigate("leaderboard")
            }
          >
            Leaderboard
          </button>

          <button
            onClick={() =>
              navigate("passport")
            }
          >
            Passport
          </button>

          <span className="green-points-nav">
            🌿 {greenPoints}
          </span>

          <button
            onClick={handleLogout}
            style={{
              border:
                "1px solid #d6e3da",
              background: "#fff",
              color: "#24533c",
              padding:
                "8px 12px",
              borderRadius: "9px",
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* ================= ACCOUNT BAR ================= */}

      <div
        style={{
          padding:
            "10px 6%",
          background:
            "#eef8f1",
          display: "flex",
          justifyContent:
            "flex-end",
          alignItems:
            "center",
          gap: "10px",
          fontSize:
            "13px",
          color:
            "#416153"
        }}
      >
        {user.photoURL && (
          <img
            src={user.photoURL}
            alt="Profile"
            style={{
              width: "30px",
              height: "30px",
              borderRadius:
                "50%"
            }}
          />
        )}

        <span>
          {user.displayName ||
            "WasteFlow User"}
        </span>

        <span>•</span>

        <span>
          {user.email}
        </span>
      </div>

      {/* =================================================
          HOME
          ================================================= */}

      {activePage === "home" && (
        <>
          <section
            className="hero"
            id="home"
          >
            <div className="hero-content">
              <p className="eyebrow">
                AI-POWERED WASTE MANAGEMENT
              </p>

              <h1>
                Turn Waste Into
                <span>
                  {" "}Positive Action.
                </span>
              </h1>

              <p className="hero-text">
                WasteFlow identifies waste,
                connects citizens with
                municipal action and
                verifies environmental
                missions.
              </p>

              <div className="hero-buttons">
                <button
                  className="primary-btn"
                  onClick={
                    openReport
                  }
                >
                  📷 Report Waste
                </button>

                <button
                  className="secondary-btn"
                  onClick={() =>
                    navigate(
                      "missions"
                    )
                  }
                >
                  🌱 Green Missions
                </button>
              </div>

              <div className="hero-stats">
                <div>
                  <strong>
                    {reports.length}
                  </strong>
                  <span>
                    Waste Reports
                  </span>
                </div>

                <div>
                  <strong>
                    {completedMissions}
                  </strong>
                  <span>
                    Missions
                  </span>
                </div>

                <div>
                  <strong>
                    {greenPoints}
                  </strong>
                  <span>
                    Green Points
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* QUICK ACTIONS */}

          <section
            className="features"
          >
            <div className="section-heading">
              <p className="eyebrow">
                YOUR WASTEFLOW
              </p>

              <h2>
                Environmental Action
                Hub
              </h2>
            </div>

            <div className="features-grid">
              <ActionCard
                icon="📷"
                title="Report Waste"
                text="Use AI to identify waste and send a report."
                button="Report"
                onClick={
                  openReport
                }
              />

              <ActionCard
                icon="🧹"
                title="Clean Near Me"
                text="Find cleanup locations on the in-app map."
                button="Open Map"
                onClick={
                  openMap
                }
              />

              <ActionCard
                icon="🌱"
                title="Green Missions"
                text="Complete verified actions and earn Green Points."
                button="Explore"
                onClick={() =>
                  navigate(
                    "missions"
                  )
                }
              />
            </div>
          </section>

          {/* COMMUNITY REPORTS */}

          <section
            className="community-reports"
          >
            <div className="section-heading">
              <p className="eyebrow">
                COMMUNITY DATA
              </p>

              <h2>
                Recent Waste Reports
              </h2>
            </div>

            <button
              className="primary-btn"
              onClick={
                loadReports
              }
              disabled={
                loadingReports
              }
            >
              {loadingReports
                ? "Refreshing..."
                : "Refresh Reports"}
            </button>

            {reports.length ===
            0 ? (
              <div className="no-reports">
                No waste reports yet.
              </div>
            ) : (
              <div className="reports-grid">
                {reports
                  .slice(0, 6)
                  .map(
                    (report) => (
                      <div
                        className="report-card"
                        key={
                          report.id
                        }
                      >
                        <span className="eyebrow">
                          REPORT #
                          {
                            report.id
                          }
                        </span>

                        <h3>
                          ♻️{" "}
                          {
                            report.type
                          }
                        </h3>

                        <p>
                          <strong>
                            Severity:
                          </strong>{" "}
                          {
                            report.severity
                          }
                        </p>

                        <p>
                          <strong>
                            Recovery:
                          </strong>{" "}
                          {
                            report.recovery
                          }
                        </p>

                        <p>
                          <strong>
                            📍
                          </strong>{" "}
                          {
                            report.location
                          }
                        </p>
                      </div>
                    )
                  )}
              </div>
            )}
          </section>
        </>
      )}

      {/* =================================================
          MISSIONS
          ================================================= */}

      {activePage ===
        "missions" && (
        <section className="missions">
          <div className="section-heading">
            <p className="eyebrow">
              GREEN PASSPORT
            </p>

            <h2>
              Verified Environmental
              Missions
            </h2>

            <p>
              Complete real-world
              actions and build your
              environmental record.
            </p>
          </div>

          <div
            className="green-passport-header"
          >
            <div>
              <span>
                GREEN POINTS
              </span>

              <strong>
                {greenPoints}
              </strong>

              <small>
                points
              </small>
            </div>

            <div className="passport-badge">
              🌱
              <span>
                Eco Explorer
              </span>
            </div>
          </div>

          <div className="passport-card">

            {/* REPORT */}

            <MissionCard
              icon="📷"
              title="Report Waste"
              description="AI-assisted waste classification and community reporting."
              tag="+10 POINTS"
              button="Start"
              onClick={
                openReport
              }
            />

            {/* CLEANUP */}

            <MissionCard
              icon="🧹"
              title="Verified Cleanup"
              description="Reach a cleanup location and submit BEFORE + AFTER evidence."
              tag="EVIDENCE REQUIRED"
              button="Open Map"
              onClick={
                openMap
              }
            />

            {/* PLANTATION */}

            <MissionCard
              icon="🌳"
              title="Plant & Protect"
              description="Build a 100-day evidence trail for a planted tree."
              tag="100-DAY JOURNEY"
              button={
                plantationStarted
                  ? "Continue"
                  : "Start"
              }
              featured
              onClick={
                openPlantation
              }
            />

            {/* LEADERBOARD */}

            <MissionCard
              icon="🏆"
              title="Green Leaderboard"
              description="Compare your verified environmental points with the community."
              tag="COMPETITION"
              button="View"
              onClick={() =>
                navigate(
                  "leaderboard"
                )
              }
            />
          </div>

          {/* PLANTATION TIMELINE */}

          <div className="plantation-preview">
            <div className="section-heading">
              <p className="eyebrow">
                PLANTATION JOURNEY
              </p>

              <h2>
                100-Day Verification
              </h2>
            </div>

            <div className="timeline">
              <TimelineStep
                icon="🌱"
                day="Day 0"
                label="Plant"
                active={
                  plantationStarted
                }
              />

              <div className="timeline-line" />

              <TimelineStep
                icon="📸"
                day="Day 7"
                label="Progress"
                active={
                  plantationDay >=
                  7
                }
              />

              <div className="timeline-line" />

              <TimelineStep
                icon="🌿"
                day="Day 30"
                label="Growth"
                active={
                  plantationDay >=
                  30
                }
              />

              <div className="timeline-line" />

              <TimelineStep
                icon="🌳"
                day="Day 60"
                label="Growth"
                active={
                  plantationDay >=
                  60
                }
              />

              <div className="timeline-line" />

              <TimelineStep
                icon="🏆"
                day="Day 100"
                label="Certificate"
                premium
                active={
                  plantationDay >=
                  100
                }
              />
            </div>
          </div>
        </section>
      )}

      {/* =================================================
          LEADERBOARD
          ================================================= */}

      {activePage ===
        "leaderboard" && (
        <section className="missions">
          <div className="section-heading">
            <p className="eyebrow">
              COMMUNITY IMPACT
            </p>

            <h2>
              Green Leaderboard
            </h2>

            <p>
              Your ranking is based on
              your WasteFlow Green
              Points.
            </p>
          </div>

          <div
            style={{
              maxWidth:
                "700px",
              margin:
                "0 auto",
              display:
                "grid",
              gap: "12px"
            }}
          >
            {currentLeaderboard.map(
              (
                entry,
                index
              ) => (
                <div
                  key={
                    `${entry.name}-${index}`
                  }
                  style={{
                    background:
                      "#fff",
                    borderRadius:
                      "18px",
                    padding:
                      "18px 20px",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "space-between",
                    border:
                      entry.currentUser
                        ? "2px solid #16834f"
                        : "1px solid #e2eae5"
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap:
                        "15px"
                    }}
                  >
                    <strong
                      style={{
                        width:
                          "30px"
                      }}
                    >
                      #{index +
                        1}
                    </strong>

                    <div
                      style={{
                        width:
                          "42px",
                        height:
                          "42px",
                        borderRadius:
                          "50%",
                        background:
                          "#e8f6ed",
                        display:
                          "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center"
                      }}
                    >
                      {entry.currentUser
                        ? "🌱"
                        : "🏅"}
                    </div>

                    <strong>
                      {entry.name}
                      {entry.currentUser
                        ? " (You)"
                        : ""}
                    </strong>
                  </div>

                  <strong
                    style={{
                      color:
                        "#16834f"
                    }}
                  >
                    {entry.points}
                    {" "}pts
                  </strong>
                </div>
              )
            )}
          </div>

          <div
            style={{
              maxWidth:
                "700px",
              margin:
                "25px auto 0",
              padding:
                "20px",
              background:
                "#edf7f0",
              borderRadius:
                "16px"
            }}
          >
            <strong>
              🚧 Demo leaderboard
            </strong>

            <p>
              Community ranking will
              become fully backend-powered
              in the production version.
            </p>
          </div>
        </section>
      )}

      {/* =================================================
          GREEN PASSPORT
          ================================================= */}

      {activePage ===
        "passport" && (
        <section className="missions">
          <div className="section-heading">
            <p className="eyebrow">
              YOUR ACCOUNT
            </p>

            <h2>
              Green Passport
            </h2>

            <p>
              Your environmental identity
              and verified action history.
            </p>
          </div>

          <div
            style={{
              maxWidth:
                "850px",
              margin:
                "0 auto"
            }}
          >
            <div
              style={{
                background:
                  "linear-gradient(135deg,#123b2a,#16834f)",
                color:
                  "#fff",
                borderRadius:
                  "25px",
                padding:
                  "30px",
                marginBottom:
                  "18px"
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap:
                    "18px",
                  flexWrap:
                    "wrap"
                }}
              >
                {user.photoURL ? (
                  <img
                    src={
                      user.photoURL
                    }
                    alt="Profile"
                    style={{
                      width:
                        "70px",
                      height:
                        "70px",
                      borderRadius:
                        "50%",
                      border:
                        "3px solid rgba(255,255,255,.5)"
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width:
                        "70px",
                      height:
                        "70px",
                      borderRadius:
                        "50%",
                      background:
                        "rgba(255,255,255,.15)",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      fontSize:
                        "32px"
                    }}
                  >
                    🌱
                  </div>
                )}

                <div>
                  <span
                    style={{
                      opacity:
                        .75,
                      fontSize:
                        "12px"
                    }}
                  >
                    GREEN PASSPORT HOLDER
                  </span>

                  <h2
                    style={{
                      margin:
                        "5px 0"
                    }}
                  >
                    {user.displayName ||
                      "WasteFlow User"}
                  </h2>

                  <span
                    style={{
                      opacity:
                        .8
                    }}
                  >
                    {user.email}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(3,1fr)",
                  gap:
                    "10px",
                  marginTop:
                    "28px"
                }}
              >
                <PassportStat
                  value={
                    greenPoints
                  }
                  label="Points"
                />

                <PassportStat
                  value={
                    cleanupCompleted
                  }
                  label="Cleanups"
                />

                <PassportStat
                  value={
                    completedMissions
                  }
                  label="Missions"
                />
              </div>
            </div>

            <div
              className="passport-card"
            >
              <h3>
                🏅 Achievements
              </h3>

              {achievements.length ===
              0 ? (
                <div
                  style={{
                    padding:
                      "25px 0",
                    color:
                      "#66756d"
                  }}
                >
                  Complete your first
                  verified action to
                  unlock an achievement.
                </div>
              ) : (
                achievements.map(
                  (
                    achievement
                  ) => (
                    <div
                      key={
                        achievement
                      }
                      className="mission-item"
                    >
                      <div className="mission-icon">
                        🏆
                      </div>

                      <div className="mission-info">
                        <h3>
                          {achievement}
                        </h3>

                        <p>
                          Added to your
                          WasteFlow
                          environmental
                          record.
                        </p>
                      </div>

                      <span className="mission-tag">
                        VERIFIED
                      </span>
                    </div>
                  )
                )
              )}
            </div>

            <div
              className="passport-card"
              style={{
                marginTop:
                  "18px"
              }}
            >
              <h3>
                🌳 Plantation
              </h3>

              <p>
                Status:{" "}
                <strong>
                  {plantationStarted
                    ? "Active"
                    : "Not Started"}
                </strong>
              </p>

              <p>
                Evidence Day:{" "}
                <strong>
                  {plantationDay}
                </strong>
              </p>

              <p>
                100-Day Certificate:{" "}
                <strong>
                  {certificateUnlocked
                    ? "Unlocked"
                    : "Locked"}
                </strong>
              </p>

              <button
                className="primary-btn"
                onClick={
                  openPlantation
                }
              >
                {plantationStarted
                  ? "View Mission"
                  : "Start Plantation"}
              </button>
            </div>

            <div
              className="passport-card"
              style={{
                marginTop:
                  "18px"
              }}
            >
              <h3>
                🏆 Certificates
              </h3>

              {certificateUnlocked ? (
                <div
                  style={{
                    padding:
                      "25px",
                    border:
                      "2px solid #16834f",
                    borderRadius:
                      "18px",
                    textAlign:
                      "center"
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        "45px"
                    }}
                  >
                    🏆
                  </div>

                  <h3>
                    100-Day Plantation Achievement
                  </h3>

                  <p>
                    Verified 100-day
                    plantation evidence
                    trail.
                  </p>

                  <button
                    className="primary-btn"
                    onClick={() =>
                      alert(
                        "Certificate generation is Coming Soon."
                      )
                    }
                  >
                    View Certificate
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    padding:
                      "25px",
                    background:
                      "#f4f7f5",
                    borderRadius:
                      "18px"
                  }}
                >
                  🔒 Your certificate will
                  unlock after the complete
                  verified 100-day journey.
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* =================================================
          CTA
          ================================================= */}

      <section className="cta">
        <h2>
          Real Action.
          <br />
          Real Evidence.
          <br />
          Real Impact.
        </h2>

        <p>
          WasteFlow connects environmental
          actions with measurable evidence.
        </p>

        <button
          className="primary-btn"
          onClick={
            openReport
          }
        >
          Report Waste
        </button>
      </section>

      {/* =================================================
          MAP
          ================================================= */}

      {showMap && (
        <div className="map-screen">
          <div className="map-header">
            <button
              className="map-back"
              onClick={
                closeMap
              }
            >
              ←
            </button>

            <div>
              <strong>
                Cleanup Map
              </strong>

              <span>
                Find cleanup locations
                inside WasteFlow
              </span>
            </div>
          </div>

          <MapContainer
            center={
              userLocation ||
              DEFAULT_CENTER
            }
            zoom={14}
            className="wasteflow-map"
            scrollWheelZoom
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapController
              center={
                userLocation ||
                DEFAULT_CENTER
              }
              zoom={14}
            />

            {userLocation && (
              <CircleMarker
                center={
                  userLocation
                }
                radius={9}
                pathOptions={{
                  color:
                    "#fff",
                  fillColor:
                    "#2878ff",
                  fillOpacity:
                    1,
                  weight: 3
                }}
              >
                <Popup>
                  <strong>
                    You are here
                  </strong>
                </Popup>
              </CircleMarker>
            )}

            {cleanupLocations.map(
              (cleanup) => (
                <CircleMarker
                  key={
                    cleanup.id
                  }
                  center={[
                    cleanup.lat,
                    cleanup.lng
                  ]}
                  radius={
                    selectedCleanup?.id ===
                    cleanup.id
                      ? 13
                      : 10
                  }
                  pathOptions={{
                    color:
                      "#fff",
                    fillColor:
                      selectedCleanup?.id ===
                      cleanup.id
                        ? "#0f7a48"
                        : "#2eaa60",
                    fillOpacity:
                      1,
                    weight: 3
                  }}
                  eventHandlers={{
                    click: () =>
                      selectCleanup(
                        cleanup
                      )
                  }}
                >
                  <Popup>
                    <strong>
                      {
                        cleanup.title
                      }
                    </strong>

                    <br />

                    {
                      cleanup.location
                    }

                    <br />

                    👥{" "}
                    {
                      cleanup.volunteers
                    }{" "}
                    volunteers
                  </Popup>
                </CircleMarker>
              )
            )}

            {routeCoordinates.length >
              0 && (
              <Polyline
                positions={
                  routeCoordinates
                }
                pathOptions={{
                  color:
                    "#16834f",
                  weight: 5,
                  opacity:
                    .8
                }}
              />
            )}
          </MapContainer>

          <div className="map-bottom-panel">
            {mapMessage && (
              <div className="map-route-info">
                {mapMessage}
              </div>
            )}

            {!selectedCleanup ? (
              <div className="map-empty-state">
                <div>
                  📍
                </div>

                <strong>
                  Select a cleanup
                  location
                </strong>

                <p>
                  Tap a green marker
                  to view details.
                </p>

                <button
                  className="secondary-btn"
                  onClick={
                    getUserLocation
                  }
                >
                  📍 Locate Me
                </button>
              </div>
            ) : (
              <div className="selected-cleanup">
                <div className="selected-cleanup-top">
                  <div className="selected-cleanup-icon">
                    🧹
                  </div>

                  <div>
                    <h3>
                      {
                        selectedCleanup.title
                      }
                    </h3>

                    <p>
                      {
                        selectedCleanup.location
                      }
                    </p>
                  </div>
                </div>

                <div className="map-cleanup-stats">
                  <span>
                    🗑️{" "}
                    {
                      selectedCleanup.waste
                    }
                  </span>

                  <span>
                    👥{" "}
                    {
                      selectedCleanup.volunteers
                    }{" "}
                    volunteers
                  </span>
                </div>

                <div className="map-actions">
                  <button
                    className="secondary-btn"
                    onClick={
                      getRoute
                    }
                    disabled={
                      routeLoading
                    }
                  >
                    {routeLoading
                      ? "Finding Route..."
                      : "🧭 Show Route"}
                  </button>

                  <button
                    className="primary-btn"
                    onClick={() =>
                      joinCleanup(
                        selectedCleanup
                      )
                    }
                  >
                    Join Cleanup
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================
          CLEANUP MODAL
          ================================================= */}

      {showCleanupMission &&
        selectedCleanup && (
          <div className="modal-overlay">
            <div className="mission-modal">
              <button
                className="modal-close"
                onClick={() =>
                  setShowCleanupMission(
                    false
                  )
                }
              >
                ✕
              </button>

              <div className="mission-modal-icon">
                🧹
              </div>

              <h2>
                {
                  selectedCleanup.title
                }
              </h2>

              <p className="modal-subtitle">
                Complete the cleanup and
                submit evidence for
                verification.
              </p>

              <div className="cleanup-location-box">
                <span>
                  SELECTED LOCATION
                </span>

                <strong>
                  {
                    selectedCleanup.location
                  }
                </strong>

                <button
                  className="secondary-btn"
                  onClick={
                    openMap
                  }
                >
                  🗺️ Open In-App Map
                </button>
              </div>

              <div className="verification-flow">
                <div className="verification-step done">
                  <span>1</span>

                  <div>
                    <strong>
                      Cleanup Joined
                    </strong>

                    <small>
                      No points awarded
                      for joining.
                    </small>
                  </div>
                </div>

                <div className="verification-step">
                  <span>2</span>

                  <div>
                    <strong>
                      BEFORE Photo
                    </strong>

                    <small>
                      Photograph the area
                      before cleanup.
                    </small>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={
                        handleCleanupBefore
                      }
                    />

                    {cleanupBeforePreview && (
                      <img
                        src={
                          cleanupBeforePreview
                        }
                        className="evidence-preview"
                        alt="Before cleanup"
                      />
                    )}
                  </div>
                </div>

                <div className="verification-step">
                  <span>3</span>

                  <div>
                    <strong>
                      Complete Cleanup
                    </strong>

                    <small>
                      Clean the selected
                      area.
                    </small>
                  </div>
                </div>

                <div className="verification-step">
                  <span>4</span>

                  <div>
                    <strong>
                      AFTER Photo
                    </strong>

                    <small>
                      Photograph the
                      cleaned area.
                    </small>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={
                        handleCleanupAfter
                      }
                    />

                    {cleanupAfterPreview && (
                      <img
                        src={
                          cleanupAfterPreview
                        }
                        className="evidence-preview"
                        alt="After cleanup"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="evidence-warning">
                <strong>
                  AI Evidence Check
                </strong>

                <p>
                  WasteFlow will compare the
                  submitted BEFORE and AFTER
                  evidence.
                </p>

                <small>
                  Current prototype does not
                  provide forensic proof that
                  an image is original or
                  unedited. Evidence may require
                  manual review.
                </small>
              </div>

              {!cleanupVerified ? (
                <button
                  className="submit-report-btn"
                  onClick={
                    verifyCleanup
                  }
                  disabled={
                    cleanupChecking
                  }
                >
                  {cleanupChecking
                    ? "Checking Evidence..."
                    : "Submit Evidence"}
                </button>
              ) : (
                <div className="verification-success">
                  <div className="success-icon">
                    ✓
                  </div>

                  <h3>
                    Evidence Submitted
                  </h3>

                  <p>
                    Demo evidence comparison
                    completed.
                  </p>

                  <div className="cleanup-score">
                    <strong>
                      {
                        cleanupPercent
                      }%
                    </strong>

                    <span>
                      Estimated Cleanup
                    </span>
                  </div>

                  <div className="reward-box">
                    🌱 +40 Green Points
                    <br />
                    🏅 Cleanup Achievement
                  </div>

                  <p
                    style={{
                      fontSize:
                        "12px",
                      color:
                        "#66756d"
                    }}
                  >
                    {cleanupEvidenceStatus}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      {/* =================================================
          PLANTATION MODAL
          ================================================= */}

      {showPlantation && (
        <div className="modal-overlay">
          <div className="mission-modal plantation-modal">
            <button
              className="modal-close"
              onClick={() =>
                setShowPlantation(
                  false
                )
              }
            >
              ✕
            </button>

            <div className="mission-modal-icon">
              🌳
            </div>

            <h2>
              Plant & Protect
            </h2>

            <p className="modal-subtitle">
              A 100-day evidence journey
              for your planted tree.
            </p>

            <div className="plantation-modal-timeline">
              <PlantDay
                icon="🌱"
                day="Day 0"
                label="Plant"
                active={
                  plantationStarted
                }
              />

              <div className="plant-line" />

              <PlantDay
                icon="📸"
                day="Day 7"
                label="Progress"
                active={
                  plantationDay >=
                  7
                }
              />

              <div className="plant-line" />

              <PlantDay
                icon="🌿"
                day="Day 30"
                label="Growth"
                active={
                  plantationDay >=
                  30
                }
              />

              <div className="plant-line" />

              <PlantDay
                icon="🌳"
                day="Day 60"
                label="Growth"
                active={
                  plantationDay >=
                  60
                }
              />

              <div className="plant-line" />

              <PlantDay
                icon="🏆"
                day="Day 100"
                label="Certificate"
                premium
                active={
                  plantationDay >=
                  100
                }
              />
            </div>

            {!plantationStarted ? (
              <>
                <div className="plantation-upload">
                  <h3>
                    Day 0 — Plantation
                    Evidence
                  </h3>

                  <p>
                    Upload a photo showing
                    your newly planted tree.
                  </p>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={
                      handlePlantationPhoto
                    }
                  />

                  {plantationPreview && (
                    <img
                      src={
                        plantationPreview
                      }
                      className="plantation-preview-image"
                      alt="Plantation evidence"
                    />
                  )}
                </div>

                <div className="evidence-warning">
                  <strong>
                    AI Evidence Check
                  </strong>

                  <p>
                    Day 0 verification is
                    currently a prototype
                    flow.
                  </p>

                  <small>
                    Full image authenticity
                    and continuity verification
                    is Coming Soon.
                  </small>
                </div>

                <button
                  className="submit-report-btn"
                  onClick={
                    startPlantation
                  }
                  disabled={
                    plantationChecking
                  }
                >
                  {plantationChecking
                    ? "Checking..."
                    : "Start 100-Day Mission"}
                </button>
              </>
            ) : (
              <div className="plantation-active">
                <div className="plantation-status">
                  <div className="success-icon">
                    ✓
                  </div>

                  <h3>
                    Mission Started
                  </h3>

                  <p>
                    Day 0 evidence submitted.
                  </p>

                  <span>
                    +10 Starting Points
                  </span>
                </div>

                <div className="next-check">
                  <span>
                    NEXT CHECKPOINT
                  </span>

                  <strong>
                    {plantationDay < 7
                      ? "DAY 7"
                      : plantationDay < 30
                      ? "DAY 30"
                      : plantationDay < 60
                      ? "DAY 60"
                      : "DAY 100"}
                  </strong>

                  <p>
                    Upload progress evidence
                    at the next checkpoint.
                  </p>

                  <div className="reminder-box">
                    🔔
                    <br />
                    Progress verification
                    is currently Coming Soon.
                  </div>
                </div>

                <div className="certificate-preview">
                  <div className="certificate-icon">
                    🏆
                  </div>

                  <div>
                    <strong>
                      100-Day Certificate
                    </strong>

                    <p>
                      Unlock after a complete
                      verified 100-day evidence
                      trail.
                    </p>
                  </div>

                  <span>
                    🔒
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================
          REPORT MODAL
          ================================================= */}

      {showReport && (
        <div className="modal-overlay">
          <div className="report-modal">
            <button
              className="modal-close"
              onClick={
                closeReport
              }
            >
              ✕
            </button>

            {!submitted ? (
              <>
                <h2>
                  Report Waste
                </h2>

                <p>
                  Upload a photo for
                  AI-assisted waste
                  classification.
                </p>

                <div className="upload-area">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={
                      handleImageUpload
                    }
                  />

                  {image && (
                    <img
                      src={image}
                      alt="Waste preview"
                      className="image-preview"
                    />
                  )}
                </div>

                <button
                  className="primary-btn"
                  onClick={
                    analyzeWaste
                  }
                  disabled={
                    analyzing ||
                    !imageFile
                  }
                >
                  {analyzing
                    ? "AI Analyzing..."
                    : "Analyze Waste"}
                </button>

                {analysis && (
                  <div className="analysis-result">
                    <h3>
                      AI Analysis
                    </h3>

                    <p>
                      <strong>
                        Type:
                      </strong>{" "}
                      {
                        analysis.type
                      }
                    </p>

                    <p>
                      <strong>
                        Confidence:
                      </strong>{" "}
                      {
                        analysis.confidence
                      }
                    </p>

                    <p>
                      <strong>
                        Severity:
                      </strong>{" "}
                      {
                        analysis.severity
                      }
                    </p>

                    <p>
                      <strong>
                        Recyclable:
                      </strong>{" "}
                      {
                        analysis.recyclable
                      }
                    </p>

                    <p>
                      <strong>
                        Recovery:
                      </strong>{" "}
                      {
                        analysis.recovery
                      }
                    </p>

                    <button
                      className="secondary-btn"
                      onClick={
                        getLocation
                      }
                    >
                      {gettingLocation
                        ? "Getting Location..."
                        : "Add Location"}
                    </button>

                    {location && (
                      <p>
                        <strong>
                          Location:
                        </strong>{" "}
                        {location}
                      </p>
                    )}

                    <button
                      className="submit-report-btn"
                      onClick={
                        submitReport
                      }
                    >
                      Submit Report +10
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="report-success">
                <div className="success-icon">
                  ✓
                </div>

                <h3>
                  Report Submitted
                </h3>

                <p>
                  Your waste report has
                  been added to the
                  community.
                </p>

                <span>
                  +10 Green Points
                </span>

                <button
                  className="primary-btn"
                  onClick={() => {
                    setShowReport(
                      false
                    );

                    navigate(
                      "passport"
                    );
                  }}
                  style={{
                    marginTop:
                      "20px"
                  }}
                >
                  View Green Passport
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* =====================================================
   SMALL UI COMPONENTS
   ===================================================== */

function DashboardStat({
  icon,
  label,
  value
}) {
  return (
    <div
      style={{
        background: "#fff",
        padding: "22px",
        borderRadius: "16px",
        boxShadow:
          "0 5px 20px rgba(0,0,0,.04)"
      }}
    >
      <div
        style={{
          fontSize: "22px"
        }}
      >
        {icon}
      </div>

      <span
        style={{
          color: "#66756d",
          fontSize: "13px"
        }}
      >
        {label}
      </span>

      <h2
        style={{
          margin:
            "7px 0 0"
        }}
      >
        {value}
      </h2>
    </div>
  );
}

function StatusBadge({
  status
}) {
  const background =
    status === "Completed"
      ? "#e5f7eb"
      : status ===
        "In Progress"
      ? "#fff4d6"
      : "#edf2ef";

  const color =
    status === "Completed"
      ? "#16834f"
      : "#5d6b63";

  return (
    <div
      style={{
        alignSelf:
          "flex-start",
        padding:
          "8px 12px",
        borderRadius:
          "20px",
        background,
        color,
        fontWeight:
          "700",
        fontSize:
          "12px"
      }}
    >
      {status}
    </div>
  );
}

function ActionCard({
  icon,
  title,
  text,
  button,
  onClick
}) {
  return (
    <div className="feature-card">
      <div className="feature-icon">
        {icon}
      </div>

      <h3>
        {title}
      </h3>

      <p>
        {text}
      </p>

      <button
        className="primary-btn"
        onClick={onClick}
      >
        {button}
      </button>
    </div>
  );
}

function MissionCard({
  icon,
  title,
  description,
  tag,
  button,
  onClick,
  featured
}) {
  return (
    <div
      className={
        featured
          ? "mission-item featured-mission"
          : "mission-item"
      }
    >
      <div className="mission-icon">
        {icon}
      </div>

      <div className="mission-info">
        <h3>
          {title}
        </h3>

        <p>
          {description}
        </p>

        <div className="mission-tag">
          {tag}
        </div>
      </div>

      <button
        className="primary-btn"
        onClick={onClick}
      >
        {button}
      </button>
    </div>
  );
}

function TimelineStep({
  icon,
  day,
  label,
  active,
  premium
}) {
  return (
    <div
      className={`timeline-step ${
        active ? "active" : ""
      } ${
        premium ? "premium" : ""
      }`}
    >
      <div>
        {icon}
      </div>

      <strong>
        {day}
      </strong>

      <span>
        {label}
      </span>
    </div>
  );
}

function PlantDay({
  icon,
  day,
  label,
  active,
  premium
}) {
  return (
    <div
      className={`plant-day ${
        active ? "active" : ""
      } ${
        premium ? "premium" : ""
      }`}
    >
      <span>
        {icon}
      </span>

      <strong>
        {day}
      </strong>

      <small>
        {label}
      </small>
    </div>
  );
}

function PassportStat({
  value,
  label
}) {
  return (
    <div
      style={{
        padding:
          "15px",
        borderRadius:
          "14px",
        background:
          "rgba(255,255,255,.12)",
        textAlign:
          "center"
      }}
    >
      <strong
        style={{
          display:
            "block",
          fontSize:
            "24px"
        }}
      >
        {value}
      </strong>

      <span
        style={{
          fontSize:
            "12px",
          opacity:
            .75
        }}
      >
        {label}
      </span>
    </div>
  );
}

export default App;