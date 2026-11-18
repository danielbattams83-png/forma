type GltfAccessor = { count?: number };
type GltfPrimitive = {
  mode?: number;
  indices?: number;
  attributes?: { POSITION?: number };
};
type GltfJson = {
  accessors?: GltfAccessor[];
  meshes?: { primitives?: GltfPrimitive[] }[];
};

function countTriangles(json: GltfJson): number {
  const accessors = json.accessors ?? [];
  let triangles = 0;
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      if ((primitive.mode ?? 4) !== 4) continue;
      if (primitive.indices != null) {
        triangles += Math.floor((accessors[primitive.indices]?.count ?? 0) / 3);
      } else if (primitive.attributes?.POSITION != null) {
        triangles += Math.floor(
          (accessors[primitive.attributes.POSITION]?.count ?? 0) / 3,
        );
      }
    }
  }
  return triangles;
}

function readU32(bytes: Uint8Array, offset: number) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);
}

export function polycountFromGlb(buffer: Uint8Array): number | null {
  if (buffer.length < 20) return null;
  const magic = readU32(buffer, 0);
  if (magic !== 0x46546c67) return null;
  const chunkLength = readU32(buffer, 12);
  const chunkType = readU32(buffer, 16);
  if (chunkType !== 0x4e4f534a) return null;
  if (20 + chunkLength > buffer.length) return null;
  try {
    const json = JSON.parse(new TextDecoder().decode(buffer.subarray(20, 20 + chunkLength))) as GltfJson;
    return countTriangles(json);
  } catch {
    return null;
  }
}

export function polycountFromGltf(text: string): number | null {
  try {
    return countTriangles(JSON.parse(text) as GltfJson);
  } catch {
    return null;
  }
}
