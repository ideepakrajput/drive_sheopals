const ESTIMATED_FINALIZE_BYTES_PER_SECOND = 6 * 1024 * 1024;
const MIN_FINALIZE_DURATION_MS = 8_000;
const MAX_FINALIZE_DURATION_MS = 3 * 60 * 1000;

export const TRANSFER_PROGRESS_MAX_PERCENT = 75;
export const MAX_IN_PROGRESS_PERCENT = 99;
export const PROGRESS_UI_UPDATE_INTERVAL_MS = 150;
export const FINALIZE_PROGRESS_TICK_MS = 500;

const clamp = (value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
};

export const formatUploadTimeRemaining = (ms: number | null) => {
    if (ms === null || !Number.isFinite(ms) || ms <= 0) {
        return "Estimating time...";
    }

    const totalSeconds = Math.ceil(ms / 1000);
    const totalMinutes = Math.ceil(totalSeconds / 60);
    const totalHours = Math.ceil(totalMinutes / 60);

    if (totalSeconds < 60) {
        return "Less than a minute left";
    }

    if (totalMinutes === 1) {
        return "About 1 minute left";
    }

    if (totalMinutes < 60) {
        return `About ${totalMinutes} minutes left`;
    }

    if (totalHours === 1) {
        return "About 1 hour left";
    }

    return `About ${totalHours} hours left`;
};

export const estimateFinalizeDurationMs = (fileSize: number) => {
    const estimatedMs = (fileSize / ESTIMATED_FINALIZE_BYTES_PER_SECOND) * 1000;
    return clamp(Math.round(estimatedMs), MIN_FINALIZE_DURATION_MS, MAX_FINALIZE_DURATION_MS);
};

export const getTransferProgress = (loaded: number, total: number) => {
    if (total <= 0) {
        return 0;
    }

    return Math.min(
        TRANSFER_PROGRESS_MAX_PERCENT,
        Math.max(1, Math.round((loaded / total) * TRANSFER_PROGRESS_MAX_PERCENT))
    );
};

export const getTransferTimeRemaining = ({
    elapsedMs,
    fileSize,
    loaded,
    total,
}: {
    elapsedMs: number;
    fileSize: number;
    loaded: number;
    total: number;
}) => {
    const uploadRate = elapsedMs > 0 ? loaded / elapsedMs : 0;
    const remainingBytes = total - loaded;
    const networkRemainingMs = uploadRate > 0 ? remainingBytes / uploadRate : null;

    if (networkRemainingMs === null) {
        return null;
    }

    return networkRemainingMs + estimateFinalizeDurationMs(fileSize);
};
