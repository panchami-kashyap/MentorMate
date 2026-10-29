/* ==========================================
   MENTORMATE - SHARED DATA STRUCTURE
   ========================================== */

(() => {
    "use strict";

    const KEYS = {
        students: "mentorMateStudents",
        mentors: "mentorMateMentors",
        currentUser: "mentorMateCurrentUser",
        profile: "mentorMateProfile",
        academics: "mentorMateAcademicRecords",
        attendance: "mentorMateAttendanceRecords",
        achievements: "mentorMateAchievements",
        notes: "mentorMateMentorNotes",
        recommendations: "mentorMateRecommendations",
        activity: "mentorMateRecentActivity"
    };

    function read(key, fallback = []) {
        try {
            const value = JSON.parse(localStorage.getItem(key));

            return value === null ? fallback : value;
        } catch (error) {
            console.error("MentorMate: Could not read", key, error);
            return fallback;
        }
    }

    function write(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function createId(prefix = "USER") {
        const uniquePart =
            window.crypto &&
            typeof window.crypto.randomUUID === "function"
                ? window.crypto.randomUUID()
                : Date.now().toString(36) +
                  Math.random().toString(36).slice(2);

        return `${prefix}_${uniquePart}`;
    }

    function getStudents() {
        const students = read(KEYS.students, []);
        return Array.isArray(students) ? students : [];
    }

    function getMentors() {
        const mentors = read(KEYS.mentors, []);
        return Array.isArray(mentors) ? mentors : [];
    }

    function saveStudents(students) {
        if (!Array.isArray(students)) {
            throw new Error("Students must be an array.");
        }

        write(KEYS.students, students);
    }

    function saveMentors(mentors) {
        if (!Array.isArray(mentors)) {
            throw new Error("Mentors must be an array.");
        }

        write(KEYS.mentors, mentors);
    }

    function getCurrentUser() {
        return read(KEYS.currentUser, null);
    }

    function setCurrentUser(user) {
        write(KEYS.currentUser, user);
    }

    function getStudentById(studentId) {
        return getStudents().find(
            student => student.id === studentId
        ) || null;
    }

    function getMentorById(mentorId) {
        return getMentors().find(
            mentor => mentor.id === mentorId
        ) || null;
    }

    function getStudentsForMentor(mentorId) {
        return getStudents().filter(
            student => student.mentorId === mentorId
        );
    }

    function registerStudent(profile, mentorId = "") {
        const students = getStudents();

        const usn = String(profile.usn || "")
            .trim()
            .toUpperCase();

        if (!usn) {
            throw new Error("A student USN is required.");
        }

        const duplicate = students.some(
            student =>
                String(student.usn || "").toUpperCase() === usn
        );

        if (duplicate) {
            throw new Error("A student with this USN already exists.");
        }

        if (mentorId && !getMentorById(mentorId)) {
            throw new Error("Please select a valid mentor.");
        }

        const student = {
            ...profile,
            id: createId("STUDENT"),
            usn,
            mentorId,
            createdAt: new Date().toISOString()
        };

        students.push(student);
        saveStudents(students);

        return student;
    }

    function registerMentor(mentor) {
        const mentors = getMentors();

        const email = String(mentor.email || "")
            .trim()
            .toLowerCase();

        if (!email) {
            throw new Error("A mentor email address is required.");
        }

        const duplicate = mentors.some(
            item =>
                String(item.email || "").toLowerCase() === email
        );

        if (duplicate) {
            throw new Error("A mentor with this email already exists.");
        }

        const newMentor = {
            ...mentor,
            id: createId("MENTOR"),
            email,
            createdAt: new Date().toISOString()
        };

        mentors.push(newMentor);
        saveMentors(mentors);

        return newMentor;
    }

    window.MentorMateData = {
        KEYS,
        read,
        write,
        createId,
        getStudents,
        getMentors,
        saveStudents,
        saveMentors,
        getCurrentUser,
        setCurrentUser,
        getStudentById,
        getMentorById,
        getStudentsForMentor,
        registerStudent,
        registerMentor
    };
})();