"""CPU adaptation of the cluster fallrc.py radiance cascade solver."""
import math
import torch
import torch.nn.functional as F

def rc_batch(sig, eps, r0=1., steps=8, air=0.):
    """2D radiance cascades on a batch of scenes: sig, eps (B,1,N,N) -> fluence (B,N,N). Same scheme as asciiworld films/forms/rc.py."""
    dev = sig.device
    B, _, N, _ = sig.shape; Sg, Em = [sig], [eps]
    for _ in range(int(math.log2(N)) - 2): Sg.append(F.avg_pool2d(Sg[-1], 2)); Em.append(F.avg_pool2d(Em[-1], 2))
    n = 0
    while r0 * (4 ** n - 1) / 3 < N * 1.5: n += 1
    up = None
    for i in reversed(range(n)):
        Ni, D = max(1, N >> i), 4 ** (i + 1); t0, t1 = r0 * (4 ** i - 1) / 3, r0 * (4 ** (i + 1) - 1) / 3; ds = (t1 - t0) / steps
        lv = min(len(Sg) - 1, max(0, int(math.log2(max(1., ds))))); sp = N / Ni
        c = (torch.arange(Ni, device=dev) + .5) * sp; a = (torch.arange(D, device=dev) + .5) * 2 * math.pi / D
        dx, dy = torch.cos(a)[:, None, None], torch.sin(a)[:, None, None]
        Lr = torch.zeros(B, D, Ni, Ni, device=dev); Tr = torch.ones(B, D, Ni, Ni, device=dev)
        for k in range(steps):
            t = t0 + (k + .5) * ds
            px, py = torch.broadcast_tensors(c[None, None, :] + dx * t, c[None, :, None] + dy * t)
            g = torch.stack([px / N * 2 - 1, py / N * 2 - 1], -1).reshape(1, -1, 1, 2).expand(B, -1, -1, -1)
            s = F.grid_sample(Sg[lv], g, align_corners=False).reshape(B, D, Ni, Ni); e = F.grid_sample(Em[lv], g, align_corners=False).reshape(B, D, Ni, Ni)
            al = 1 - torch.exp(-s * ds); Lr = Lr + Tr * al * e / s.clamp_min(1e-6); Tr = Tr * (1 - al) * math.exp(-air * ds)
        if up is not None: Lr = Lr + Tr * up
        if i > 0:
            P = Lr.reshape(B, D // 4, 4, Ni, Ni).mean(2)
            up = F.interpolate(P, size=(N >> (i - 1), N >> (i - 1)), mode='bilinear', align_corners=False)
    return Lr.mean(1)
