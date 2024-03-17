import { AppointmentNotificationInput } from '../constant';

export const AppointmentNotificationEmailTemplate = (
  appointmentNotificationInput: AppointmentNotificationInput,
) => {
  const { petOwner, pet, veterinarian, date, services } =
    appointmentNotificationInput;
  return `
    <div
        style="
            background-color: #fff;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 2px 4px -1px rgba(0, 0, 0, 0.06);
            border-radius: 0.5rem;
            padding: 1.5rem;
            ">
        <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem">Cita</h2>
        <div style="border-bottom: 1px solid #e5e7eb; margin-bottom: 1rem"></div>
        <div
            style="
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 1.5rem;
            margin-bottom: 1rem;
            ">
            <div style="display: flex; align-items: center">
            <div>
                <div style="font-weight: 600">Dueño de mascota</div>
                <div>${petOwner}</div>
            </div>
            </div>
            <div style="display: flex; align-items: center">
            <div>
                <div style="font-weight: 600">Mascota</div>
                <div>${pet}</div>
            </div>
            </div>
        </div>
        <div
            style="
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 1.5rem;
            margin-bottom: 1rem;
            "
        >
            <div>
            <div style="font-weight: 600; margin-bottom: 0.5rem">Veterinario</div>
            <div>${veterinarian}</div>
            </div>
            <div>
            <div style="font-weight: 600; margin-bottom: 0.5rem">Cita</div>
            <div>${date}</div>
            </div>
            <div>
            <div style="font-weight: 600; margin-bottom: 0.5rem">Tiempo</div>
            <div>${date}</div>
            </div>

            <div>
            <div style="font-weight: 600; margin-bottom: 0.5rem">Servicios</div>
            <div>${
              typeof services == 'string' ? services : services.concat(' ')
            }</div>
            </div>
        </div>
        </div>

    `;
};
