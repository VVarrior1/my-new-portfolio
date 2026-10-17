/**
 * The spine: one wire in the lane left of the content, from the simulator to the contact console.
 * `SpineTrunk` is the wire itself (one per page, inside the sheet); `Station` is where it meets an
 * object: a node on the wire and a branch to the object's left edge. A station is absolutely
 * placed on its parent's left edge, so the parent must be `relative` and start on the content edge;
 * set its height with a `top-*` class. components/choreography.tsx lights each one as the packet
 * reaches it. All of it is decoration and hidden from assistive technology.
 */
export function SpineTrunk() {
  return (
    <span aria-hidden="true" className="spine-trunk" data-spine>
      <span className="spine-lit" />
    </span>
  );
}

export function Station({
  className = "",
  bare = false,
  role,
  route,
}: {
  className?: string;
  /** The path the packet's label shows once it has passed this station, e.g. "/work/systemlab". */
  route: string;
  /** No branch: just a node on the wire. */
  bare?: boolean;
  /** "origin" is where the wire starts (lit from the start); "end" is where it stops. */
  role?: "origin" | "end";
}) {
  return (
    <span
      aria-hidden="true"
      className={`station ${bare ? "station-bare" : ""} ${className}`}
      data-station={role ?? ""}
      data-route={route}
      data-lit={role === "origin" ? "" : undefined}
    >
      <span className="station-branch" />
      <span className="station-node" />
      <span className="station-end" />
    </span>
  );
}
