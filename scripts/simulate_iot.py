"""Simulate IoT telemetry -> POST /api/telemetry. Threshold breach auto-creates a P1 request.
Usage: python scripts/simulate_iot.py --machine M-104 --metric vibration --value 128
Demo (no backend): prints the JSON payload the Next.js route would ingest (see README).
"""
import argparse, json, sys

THRESHOLDS = {"vibration": 100, "temperature": 85, "pressure": 10, "current": 50}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--machine", default="M-104")
    ap.add_argument("--metric", default="vibration", choices=list(THRESHOLDS))
    ap.add_argument("--value", type=float, default=128)
    ap.add_argument("--unit", default="")
    a = ap.parse_args()
    threshold = THRESHOLDS[a.metric]
    breach = a.value > threshold
    payload = {"machineId": a.machine, "metric": a.metric, "value": a.value, "threshold": threshold, "unit": a.unit}
    print(json.dumps(payload, indent=2))
    if breach:
        print(f"\nBREACH: {a.metric}={a.value} > {threshold} on {a.machine} -> auto-create P1 ServiceRequest (see Demo controls > Trigger IoT alert).", file=sys.stderr)
        sys.exit(2)
    print("\nNominal — no request created.", file=sys.stderr)

if __name__ == "__main__":
    main()
